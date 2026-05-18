/**
 * Verifies that express checkout surfaces are self-contained: multiple
 * surfaces can render simultaneously on the same page (e.g. PDP + mini-cart)
 * without coordinating through any shared registry, and each surface's
 * destroy()/render() lifecycle only affects its own state.
 *
 * The previously-enforced "one surface per page" priority registry was
 * removed in EPP-652; these tests guard against accidentally re-introducing
 * cross-surface coupling.
 */

import type { ExpressCheckoutContainerIds } from '../surface';

type SurfaceMod = typeof import('../surface');

interface TestSurface {
  render: () => Promise<void>;
  isRendered: () => boolean;
  destroy: () => void;
}

const PRODUCT_CONTAINERS: ExpressCheckoutContainerIds = {
  googlePay: 'gp-product',
  applePay: 'ap-product',
};
const CART_CONTAINERS: ExpressCheckoutContainerIds = {
  googlePay: 'gp-cart',
  applePay: 'ap-cart',
};

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
 * Load the surface module in an isolated module registry so each test gets
 * a clean module-level state. Different `loadBundle()` calls return
 * independent module instances, mirroring the real-world case where main.js
 * and productDetail.js are separate webpack bundles.
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

const buildMethodsResponse = () => ({
  data: {
    amount: { value: 100, currency: 'USD' },
    countryCode: 'US',
    storeName: 'Test',
    shippingAddressCountryOptions: [],
  },
});

describe('createSurface (independent surfaces)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    makeContainerEl(PRODUCT_CONTAINERS.googlePay);
    makeContainerEl(PRODUCT_CONTAINERS.applePay);
    makeContainerEl(CART_CONTAINERS.googlePay);
    makeContainerEl(CART_CONTAINERS.applePay);

    (window as unknown as { httpClient: { get: jest.Mock } }).httpClient = {
      get: jest.fn().mockResolvedValue(buildMethodsResponse()),
    };
  });

  it('renders two surfaces on the same page simultaneously', async() => {
    const bundle = loadBundle();
    const productSurface = bundle.createSurface(PRODUCT_CONTAINERS) as TestSurface;
    const cartSurface = bundle.createSurface(CART_CONTAINERS) as TestSurface;

    await Promise.all([productSurface.render(), cartSurface.render()]);

    expect(productSurface.isRendered()).toBe(true);
    expect(cartSurface.isRendered()).toBe(true);
  });

  it('renders two surfaces from independent bundles simultaneously', async() => {
    const bundleA = loadBundle();
    const bundleB = loadBundle();

    const productSurface = bundleA.createSurface(PRODUCT_CONTAINERS) as TestSurface;
    await productSurface.render();
    expect(productSurface.isRendered()).toBe(true);

    const cartSurface = bundleB.createSurface(CART_CONTAINERS) as TestSurface;
    await cartSurface.render();

    expect(cartSurface.isRendered()).toBe(true);
    expect(productSurface.isRendered()).toBe(true);
  });

  it('destroying one surface does not affect the other', async() => {
    const bundle = loadBundle();
    const productSurface = bundle.createSurface(PRODUCT_CONTAINERS) as TestSurface;
    const cartSurface = bundle.createSurface(CART_CONTAINERS) as TestSurface;

    await Promise.all([productSurface.render(), cartSurface.render()]);
    expect(productSurface.isRendered()).toBe(true);
    expect(cartSurface.isRendered()).toBe(true);

    productSurface.destroy();

    expect(productSurface.isRendered()).toBe(false);
    expect(cartSurface.isRendered()).toBe(true);
  });

  // Regression: SFRA fires both `change` on .quantity-select AND
  // `product:afterAttributeSelect` on a PDP quantity change, so
  // refreshButtons() runs twice and triggers two destroy()+render() cycles.
  // The generation/isAborted guard must abort the in-flight render so it
  // does not mount stale buttons on top of the live render.
  it('aborts an in-flight render when destroy() is called mid-fetch', async() => {
    const bundle = loadBundle();
    const productSurface = bundle.createSurface(PRODUCT_CONTAINERS) as TestSurface;

    type MethodsResponse = ReturnType<typeof buildMethodsResponse>;
    let resolveFetch1!: (value: MethodsResponse) => void;
    let resolveFetch2!: (value: MethodsResponse) => void;

    (window as unknown as { httpClient: { get: jest.Mock } }).httpClient.get = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<MethodsResponse>(resolve => {
            resolveFetch1 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<MethodsResponse>(resolve => {
            resolveFetch2 = resolve;
          }),
      );

    const render1 = productSurface.render();

    productSurface.destroy();
    const render2 = productSurface.render();

    resolveFetch1(buildMethodsResponse());
    await render1;

    expect(productSurface.isRendered()).toBe(false);

    resolveFetch2(buildMethodsResponse());
    await render2;

    expect(productSurface.isRendered()).toBe(true);
  });
});
