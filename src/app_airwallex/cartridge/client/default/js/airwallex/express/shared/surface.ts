/**
 * Express checkout surface factory.
 *
 * A "surface" is a place in the storefront where Apple Pay / Google Pay
 * buttons can appear (checkout page, cart/mini-cart, product page). Each
 * surface owns its own element state and renders into its own set of
 * container DOM nodes.
 *
 * Use `createSurface(containerIds, priority)` to create a surface, then call
 * `.render()`, `.isRendered()`, and `.destroy()` on it. The priority is
 * coordinated through a shared cross-bundle registry (see `./priority`) so
 * only the highest-priority surface is mounted at any time — for example,
 * opening the mini-cart on a PDP must not mount a second pair of buttons
 * while the (higher-priority) product surface is already rendered.
 */

import { GooglePay } from '../paymentMethods/googlePay';
import { ApplePay } from '../paymentMethods/applePay';
import { isExpressCheckoutEnabled, getEnabledPaymentMethods } from './config';
import { getActiveSurfaces, hasHigherPriority, evictLowerPriority } from './priority';
import type { ActiveEntry } from './priority';
import type { ExpressCheckoutMethodsResponse } from '../../../types';
import type { ExpressCheckoutProps, ExpressCheckout } from '../paymentMethods/base';

/** DOM element IDs where the Google Pay and Apple Pay buttons are mounted. */
export interface ExpressCheckoutContainerIds {
  googlePay: string;
  applePay: string;
}

/** Tracks the mounted wallet button instances for a single surface. */
interface ExpressCheckoutState {
  googlePay: ExpressCheckout | null;
  applePay: ExpressCheckout | null;
}

export interface RenderOptions {
  /** Query params passed to Airwallex-ExpressCheckoutMethods (used by product page to send pid + quantity). */
  methodsParams?: { pid: string; quantity: number };
  /** Additional props merged into the base props for each wallet button (e.g. isExpressProduct, productData). */
  extraProps?: Partial<ExpressCheckoutProps>;
}

export interface ExpressCheckoutSurface {
  render: (options?: RenderOptions) => Promise<void>;
  isRendered: () => boolean;
  destroy: () => void;
}

const getExpressCheckoutMethods = async(params?: {
  pid: string;
  quantity: number;
}): Promise<ExpressCheckoutMethodsResponse> => {
  const queryString = params ? `?pid=${encodeURIComponent(params.pid)}&quantity=${params.quantity}` : '';
  const response = await window.httpClient.get<ExpressCheckoutMethodsResponse>(
    `Airwallex-ExpressCheckoutMethods${queryString}`,
  );
  return response.data;
};

const isRendered = (state: ExpressCheckoutState): boolean => state.googlePay !== null || state.applePay !== null;

const destroyState = (state: ExpressCheckoutState): void => {
  if (state.googlePay?.element) {
    state.googlePay.element.destroy();
  }
  if (state.applePay?.element) {
    state.applePay.element.destroy();
  }
  state.googlePay = null;
  state.applePay = null;
};

const PAYMENT_METHODS: Array<{
  key: keyof ExpressCheckoutState;
  configKey: 'googlePayEnabled' | 'applePayEnabled';
  Ctor: typeof GooglePay | typeof ApplePay;
}> = [
  { key: 'googlePay', configKey: 'googlePayEnabled', Ctor: GooglePay },
  { key: 'applePay', configKey: 'applePayEnabled', Ctor: ApplePay },
];

/**
 * Core render logic shared by all surfaces. Fetches available express methods
 * from the server, then creates and mounts the enabled wallet buttons into
 * the DOM containers identified by `containerIds`.
 */
const renderInContainers = async(
  containerIds: ExpressCheckoutContainerIds,
  state: ExpressCheckoutState,
  options?: RenderOptions,
  isAborted?: () => boolean,
): Promise<void> => {
  if (isRendered(state)) return;
  if (!isExpressCheckoutEnabled()) return;

  const enabledMethods = getEnabledPaymentMethods();

  const res = await getExpressCheckoutMethods(options?.methodsParams);
  if (isAborted?.()) return;
  if (!res.amount) return;

  const baseProps: ExpressCheckoutProps = {
    amount: res.amount,
    countryCode: res.countryCode,
    storeName: res.storeName,
    shippingAddressCountryOptions: res.shippingAddressCountryOptions,
    ...options?.extraProps,
  };

  const renderPromises: Promise<void>[] = [];

  for (const { key, configKey, Ctor } of PAYMENT_METHODS) {
    if (!enabledMethods[configKey]) continue;
    const container = document.getElementById(containerIds[key]) as HTMLDivElement;
    if (!container) continue;
    const instance = new Ctor(baseProps);
    state[key] = instance;
    renderPromises.push(
      instance.createElement(container).then(() => {
        instance.mount();
        instance.listenToEvents();
      }),
    );
  }

  await Promise.all(renderPromises);
};

/**
 * Creates a self-contained express checkout surface. Each surface manages its
 * own button state independently, so checkout / cart / product buttons don't
 * interfere with each other even if multiple surfaces exist in the DOM.
 *
 * `priority` is the surface's slot in the shared `__awxActiveSurfaces`
 * registry. Higher numbers win: when `render()` is called, any lower-priority
 * surfaces are torn down, and the call short-circuits if a higher-priority
 * surface is already active (e.g. opening the mini-cart on a PDP).
 */
export const createSurface = (containerIds: ExpressCheckoutContainerIds, priority = 0): ExpressCheckoutSurface => {
  const state: ExpressCheckoutState = { googlePay: null, applePay: null };

  // Monotonic counter incremented on every destroy(). A render captures the
  // current value before its first await; if the surface is destroyed while
  // the render is suspended (e.g. a `cart:update` event during network fetch,
  // or a quantity change on the product page), the in-flight render detects
  // the mismatch via `isAborted` and bails out before calling createElement.
  let generation = 0;

  let activeEntry: ActiveEntry | null = null;

  const unregister = (): void => {
    if (!activeEntry) return;
    const surfaces = getActiveSurfaces();
    const idx = surfaces.indexOf(activeEntry);
    if (idx !== -1) surfaces.splice(idx, 1);
    activeEntry = null;
  };

  const destroy = (): void => {
    generation++;
    destroyState(state);
    unregister();
  };

  // Idempotent: a second render() call (e.g. from a duplicate mini-cart
  // mutation event) must not push another entry — otherwise the registry
  // accumulates orphans that destroy() can't reach.
  const register = (): void => {
    if (activeEntry) return;
    activeEntry = { priority, destroy };
    getActiveSurfaces().push(activeEntry);
  };

  return {
    render: async options => {
      // A higher-priority surface (e.g. PDP) is already mounted — leave it alone.
      if (hasHigherPriority(priority)) return;
      // Tear down any lower-priority surfaces (e.g. an open mini-cart) before
      // taking the slot ourselves.
      evictLowerPriority(priority);
      // Claim the slot synchronously so concurrent renders observe it and
      // back off, instead of all racing through their `hasHigherPriority`
      // checks before any of them register.
      register();

      const gen = generation;
      try {
        await renderInContainers(containerIds, state, options, () => generation !== gen);
      } catch (error) {
        // Only release our slot if no concurrent destroy() bumped the
        // generation — otherwise `activeEntry` now belongs to a *later*
        // render() and we'd evict it by mistake.
        if (generation === gen) unregister();
        throw error;
      }

      // If the render produced no buttons (empty cart, no enabled methods),
      // release the slot so other surfaces can claim it. Same caveat: if a
      // concurrent destroy() already bumped the generation, `activeEntry`
      // is owned by a later render() and is *not* ours to remove. (This is
      // the bug that left the registry empty after PDP quantity change:
      // SFRA fires both `change` and `product:afterAttributeSelect`, so
      // refreshButtons() runs twice; the first, aborted render's stale
      // unregister() was deleting the second render's entry.)
      if (generation === gen && !isRendered(state)) {
        unregister();
      }
    },
    isRendered: () => isRendered(state),
    destroy,
  };
};
