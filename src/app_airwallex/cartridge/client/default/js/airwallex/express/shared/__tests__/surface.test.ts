/**
 * Verifies that the cross-bundle priority registry actually keeps only the
 * highest-priority surface mounted, even when each "bundle" instantiates its
 * own surface (the real-world scenario: main.js and productDetail.js are
 * separate webpack bundles with their own copies of every module).
 *
 * We simulate "separate bundles" by jest.isolateModules-ing the surface and
 * priority modules twice: each call gets a fresh module instance whose
 * top-level state is independent, but they share `window.__awxActiveSurfaces`.
 */

type SurfaceMod = typeof import('../surface');

interface TestSurface {
  render: () => Promise<void>;
  isRendered: () => boolean;
  destroy: () => void;
}

const FAKE_CONTAINERS = { googlePay: 'gp', applePay: 'ap' };

const makeContainerEl = (id: string): HTMLDivElement => {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
};

interface MockedExpressCheckoutCtor {
  new (props: unknown): {
    createElement: jest.Mock;
    mount: jest.Mock;
    listenToEvents: jest.Mock;
    element: { destroy: jest.Mock };
  };
}

const mockPaymentMethods = (): MockedExpressCheckoutCtor => {
  const Ctor = jest.fn(function(this: {
    element: unknown;
    createElement: jest.Mock;
    mount: jest.Mock;
    listenToEvents: jest.Mock;
  }) {
    this.element = { destroy: jest.fn() };
    this.createElement = jest.fn().mockResolvedValue(this.element);
    this.mount = jest.fn();
    this.listenToEvents = jest.fn();
  }) as unknown as MockedExpressCheckoutCtor;
  return Ctor;
};

/**
 * Simulate loading the surface module in a fresh "bundle". Each call returns
 * a brand-new module instance whose internal priority module has its own
 * function identities, but they all read/write `window.__awxActiveSurfaces`.
 */
const loadBundle = (): SurfaceMod => {
  let mod!: SurfaceMod;
  jest.isolateModules(() => {
    jest.doMock('../../paymentMethods/googlePay', () => ({ GooglePay: mockPaymentMethods() }));
    jest.doMock('../../paymentMethods/applePay', () => ({ ApplePay: mockPaymentMethods() }));
    jest.doMock('../config', () => ({
      isExpressCheckoutEnabled: () => true,
      getEnabledPaymentMethods: () => ({ googlePayEnabled: true, applePayEnabled: false }),
    }));
    mod = require('../surface') as SurfaceMod;
  });
  return mod;
};

describe('createSurface (cross-bundle priority)', () => {
  beforeEach(() => {
    delete (window as { __awxActiveSurfaces?: unknown }).__awxActiveSurfaces;
    document.body.innerHTML = '';
    makeContainerEl(FAKE_CONTAINERS.googlePay);
    makeContainerEl(FAKE_CONTAINERS.applePay);

    (window as unknown as { httpClient: { get: jest.Mock } }).httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          amount: { value: 100, currency: 'USD' },
          countryCode: 'US',
          storeName: 'Test',
          shippingAddressCountryOptions: [],
        },
      }),
    };
  });

  it('mini-cart (priority 1) does not render while PDP (priority 2) is mounted, even when in different bundles', async() => {
    // Two separate "bundles", each with its own copy of the surface module.
    const bundleA = loadBundle();
    const bundleB = loadBundle();

    // PDP renders first, claiming priority 2 in the shared registry.
    const productSurface = bundleA.createSurface(FAKE_CONTAINERS, 2) as TestSurface;
    await productSurface.render();
    expect(productSurface.isRendered()).toBe(true);

    // Now the (other-bundle) mini-cart tries to render at priority 1.
    const cartSurface = bundleB.createSurface(FAKE_CONTAINERS, 1) as TestSurface;
    await cartSurface.render();

    // It must back off because the PDP is higher-priority.
    expect(cartSurface.isRendered()).toBe(false);
    expect(productSurface.isRendered()).toBe(true);
  });

  it('PDP (priority 2) evicts an active mini-cart (priority 1) on render', async() => {
    const bundleA = loadBundle();
    const bundleB = loadBundle();

    const cartSurface = bundleA.createSurface(FAKE_CONTAINERS, 1) as TestSurface;
    await cartSurface.render();
    expect(cartSurface.isRendered()).toBe(true);

    const productSurface = bundleB.createSurface(FAKE_CONTAINERS, 2) as TestSurface;
    await productSurface.render();

    expect(cartSurface.isRendered()).toBe(false);
    expect(productSurface.isRendered()).toBe(true);
  });

  it('destroying the higher-priority surface frees the slot for a re-rendered mini-cart', async() => {
    const bundleA = loadBundle();
    const bundleB = loadBundle();

    const productSurface = bundleA.createSurface(FAKE_CONTAINERS, 2) as TestSurface;
    await productSurface.render();
    productSurface.destroy();
    expect(productSurface.isRendered()).toBe(false);

    const cartSurface = bundleB.createSurface(FAKE_CONTAINERS, 1) as TestSurface;
    await cartSurface.render();
    expect(cartSurface.isRendered()).toBe(true);
  });

  // Regression: SFRA fires both `change` on .quantity-select AND
  // `product:afterAttributeSelect` on a PDP quantity change, so
  // refreshButtons() runs twice and we end up with two overlapping
  // destroy()+render() cycles. The first (aborted) render must NOT remove
  // the second render's entry from the priority registry — otherwise the
  // PDP buttons stay mounted but the slot is empty, and the next mini-cart
  // open mounts a duplicate set of buttons.
  it("an aborted concurrent render does not unregister the live render's entry", async() => {
    const bundle = loadBundle();
    const productSurface = bundle.createSurface(FAKE_CONTAINERS, 2) as TestSurface;

    // Resolve the methods response only when we say so, so we can interleave
    // a destroy()+render() while render-1 is suspended at the network await.
    type MethodsResponse = {
      amount: { value: number; currency: string };
      countryCode: string;
      storeName: string;
      shippingAddressCountryOptions: never[];
    };
    let resolveFetch1!: (value: { data: MethodsResponse }) => void;
    let resolveFetch2!: (value: { data: MethodsResponse }) => void;
    const fetchResponse: { data: MethodsResponse } = {
      data: {
        amount: { value: 100, currency: 'USD' },
        countryCode: 'US',
        storeName: 'Test',
        shippingAddressCountryOptions: [],
      },
    };
    (window as unknown as { httpClient: { get: jest.Mock } }).httpClient.get = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFetch1 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFetch2 = resolve;
          }),
      );

    // Render-1: starts, registers, suspends at the network fetch.
    const render1 = productSurface.render();
    expect(window.__awxActiveSurfaces).toEqual([{ priority: 2, destroy: expect.any(Function) }]);

    // SFRA's `product:afterAttributeSelect` fires while render-1 is in
    // flight. refreshButtons() does destroy() + initAndRender() → render-2.
    productSurface.destroy();
    expect(window.__awxActiveSurfaces).toEqual([]);
    const render2 = productSurface.render();
    expect(window.__awxActiveSurfaces).toHaveLength(1);

    // Render-1's fetch returns now (gets aborted by the generation change).
    resolveFetch1(fetchResponse);
    await render1;

    // BUG GUARD: render-1's stale unregister() must not have removed
    // render-2's entry. The registry should still contain the priority-2
    // slot owned by render-2.
    expect(window.__awxActiveSurfaces).toHaveLength(1);
    expect(window.__awxActiveSurfaces?.[0].priority).toBe(2);

    // Render-2 completes, buttons mount, slot stays claimed.
    resolveFetch2(fetchResponse);
    await render2;
    expect(productSurface.isRendered()).toBe(true);
    expect(window.__awxActiveSurfaces).toHaveLength(1);
  });
});
