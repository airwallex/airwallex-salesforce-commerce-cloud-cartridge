/**
 * Express checkout surface factory.
 *
 * A "surface" is a place in the storefront where Apple Pay / Google Pay
 * buttons can appear (checkout page, cart/mini-cart, product page). Each
 * surface owns its own element state and renders into its own set of
 * container DOM nodes.
 *
 * Use `createSurface(containerIds)` to create a surface, then call
 * `.render()`, `.isRendered()`, and `.destroy()` on it.
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
 * When `priority` is provided the surface participates in a global priority
 * registry: higher-priority surfaces evict lower-priority ones, and a surface
 * will not render while a higher-priority surface is active.  Surfaces without
 * a priority bypass the registry entirely.
 */
export const createSurface = (containerIds: ExpressCheckoutContainerIds, priority?: number): ExpressCheckoutSurface => {
  const state: ExpressCheckoutState = { googlePay: null, applePay: null };
  let activeEntry: ActiveEntry | null = null;

  // Monotonic counter incremented on every destroy(). A render captures the
  // current value before its first await; if the value changes while the
  // render is suspended (because a higher-priority surface evicted this one),
  // the in-flight render detects the mismatch via `isAborted` and bails out
  // before calling createElement — avoiding a concurrent SDK call that would
  // violate the one-element-per-buttonType constraint.
  let generation = 0;

  const unregister = (): void => {
    if (activeEntry) {
      const surfaces = getActiveSurfaces();
      const idx = surfaces.indexOf(activeEntry);
      if (idx !== -1) surfaces.splice(idx, 1);
      activeEntry = null;
    }
  };

  const destroy = (): void => {
    generation++;
    destroyState(state);
    unregister();
  };

  return {
    render: async options => {
      if (priority !== undefined) {
        if (hasHigherPriority(priority)) return;
        evictLowerPriority(priority);
        activeEntry = { priority, destroy };
        getActiveSurfaces().push(activeEntry);
      }
      // Snapshot the generation before awaiting. If destroy() is called while
      // renderInContainers is suspended at an async boundary (e.g. the network
      // fetch), generation will have incremented and the isAborted callback
      // passed below will return true, aborting the stale render.
      const gen = generation;
      await renderInContainers(containerIds, state, options, () => generation !== gen);
      if (priority !== undefined && !isRendered(state)) {
        unregister();
      }
    },
    isRendered: () => isRendered(state),
    destroy,
  };
};
