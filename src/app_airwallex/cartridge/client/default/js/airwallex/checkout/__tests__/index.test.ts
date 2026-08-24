jest.mock('../billing', () => ({
  destroyCard: jest.fn(),
  handleCheckoutStageChange: jest.fn(() => true),
  handleUpdateCheckoutView: jest.fn(),
  hasPendingCardPayment: jest.fn(() => false),
  renderCard: jest.fn(),
  setupCardPlaceOrderInterception: jest.fn(),
  validateCardForm: jest.fn(),
}));

jest.mock('../billing/helpers', () => ({
  displayError: jest.fn(),
}));

jest.mock('../recovery', () => {
  const controller = {
    clearCardRecovery: jest.fn(),
    isCardReview: jest.fn(() => true),
    recoverReview: jest.fn(() => false),
    requireCardRecovery: jest.fn(),
    shouldHidePlaceOrder: jest.fn(() => false),
    showRecoveryMessage: jest.fn(),
  };
  return {
    createCardCheckoutRecovery: jest.fn(() => controller),
    controller,
  };
});

jest.mock('../../express/index', () => ({
  checkoutSurface: { render: jest.fn(), destroy: jest.fn() },
}));

jest.mock('../../express/shared/dependencies', () => ({
  waitForDependencies: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/sdk', () => ({
  initAirwallexSDK: jest.fn(() => Promise.resolve()),
}));

import { init } from '../index';

const waitForInit = () => new Promise(resolve => setTimeout(resolve, 0));

describe('checkout recovery integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires card recovery when checkout-view data cannot rebuild pending state', async() => {
    const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
    let observerCallback: MutationCallback | undefined;
    const jquery = jest.fn((target: unknown) => {
      if (target === document) {
        return {
          ready: (callback: () => Promise<void>) => {
            void callback();
          },
        };
      }
      if (target === 'body') {
        return {
          on: (eventName: string, handler: (...args: unknown[]) => void) => {
            eventHandlers[eventName] = handler;
          },
        };
      }
      if (target === '.payment-information') {
        return { data: () => 'AirwallexCreditCard' };
      }
      return { hide: jest.fn() };
    });
    Object.defineProperty(window, '$', { configurable: true, value: jquery });
    Object.defineProperty(window, 'MutationObserver', {
      configurable: true,
      value: jest.fn((callback: MutationCallback) => {
        observerCallback = callback;
        return { observe: jest.fn() };
      }),
    });
    document.body.innerHTML = `
      <div id="checkout-main" data-checkout-stage="payment"></div>
      <input
        class="awx-payment-method-radio"
        type="radio"
        value="AirwallexCreditCard"
        data-content="#credit-card-content"
        data-pane="#credit-card-pane"
        checked
      />
      <input
        class="awx-payment-method-radio"
        type="radio"
        value="AirwallexOnline"
        data-content="#lpm-content"
        data-pane="#lpm-pane"
      />
    `;
    const billing = jest.requireMock('../billing') as {
      destroyCard: jest.Mock;
      handleCheckoutStageChange: jest.Mock;
      handleUpdateCheckoutView: jest.Mock;
      hasPendingCardPayment: jest.Mock;
      renderCard: jest.Mock;
      setupCardPlaceOrderInterception: jest.Mock;
    };
    const recovery = jest.requireMock('../recovery') as {
      controller: {
        clearCardRecovery: jest.Mock;
        recoverReview: jest.Mock;
        requireCardRecovery: jest.Mock;
        showRecoveryMessage: jest.Mock;
      };
    };
    let resolveRenderCard: (() => void) | undefined;
    billing.renderCard.mockReturnValue(
      new Promise<void>(resolve => {
        resolveRenderCard = resolve;
      }),
    );

    init();
    await waitForInit();

    expect(eventHandlers['checkout:updateCheckoutView']).toBeDefined();
    expect(billing.setupCardPlaceOrderInterception).toHaveBeenCalledWith(
      expect.objectContaining({
        recoverConfirmationFailure: expect.any(Function),
        recoverReview: expect.any(Function),
      }),
    );
    expect(recovery.controller.showRecoveryMessage).toHaveBeenCalledTimes(1);
    const cardRadio = document.querySelector<HTMLInputElement>('input[value="AirwallexCreditCard"]')!;
    const localPaymentRadio = document.querySelector<HTMLInputElement>('input[value="AirwallexOnline"]')!;
    cardRadio.checked = false;
    localPaymentRadio.checked = true;
    localPaymentRadio.dispatchEvent(new Event('change'));

    expect(billing.destroyCard).toHaveBeenCalledTimes(1);
    expect(recovery.controller.clearCardRecovery).toHaveBeenCalledTimes(1);

    resolveRenderCard?.();
    await waitForInit();

    expect(billing.destroyCard).toHaveBeenCalledTimes(2);
    expect(recovery.controller.showRecoveryMessage).toHaveBeenCalledTimes(2);
    cardRadio.checked = true;
    localPaymentRadio.checked = false;
    cardRadio.dispatchEvent(new Event('change'));
    await waitForInit();

    recovery.controller.showRecoveryMessage.mockClear();
    recovery.controller.recoverReview.mockClear();
    billing.handleCheckoutStageChange.mockClear();
    eventHandlers['checkout:serializeBilling']();
    const checkoutMain = document.getElementById('checkout-main')!;
    checkoutMain.setAttribute('data-checkout-stage', 'placeOrder');
    billing.handleCheckoutStageChange.mockReturnValue(false);
    observerCallback?.(
      [{ attributeName: 'data-checkout-stage', target: checkoutMain } as unknown as MutationRecord],
      {} as MutationObserver,
    );

    expect(billing.handleCheckoutStageChange).not.toHaveBeenCalled();
    expect(recovery.controller.recoverReview).not.toHaveBeenCalled();

    eventHandlers['checkout:updateCheckoutView']({}, undefined);

    expect(billing.handleUpdateCheckoutView).toHaveBeenCalledWith(undefined, true);
    expect(recovery.controller.requireCardRecovery).toHaveBeenCalledTimes(1);
    expect(billing.handleCheckoutStageChange).toHaveBeenCalledWith('placeOrder');
    expect(recovery.controller.recoverReview).toHaveBeenCalledTimes(1);
    expect(recovery.controller.showRecoveryMessage).toHaveBeenCalledTimes(1);

    recovery.controller.requireCardRecovery.mockClear();
    recovery.controller.showRecoveryMessage.mockClear();
    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'shipping');

    eventHandlers['checkout:updateCheckoutView']({}, undefined);

    expect(recovery.controller.requireCardRecovery).not.toHaveBeenCalled();
    expect(recovery.controller.showRecoveryMessage).toHaveBeenCalledTimes(1);

    recovery.controller.clearCardRecovery.mockClear();
    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'payment');
    cardRadio.checked = false;
    localPaymentRadio.checked = true;

    eventHandlers['checkout:serializeBilling']();
    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'placeOrder');
    eventHandlers['checkout:updateCheckoutView']({}, undefined);

    expect(recovery.controller.clearCardRecovery).toHaveBeenCalledTimes(1);

    recovery.controller.requireCardRecovery.mockClear();
    cardRadio.checked = true;
    localPaymentRadio.checked = false;
    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'payment');
    eventHandlers['checkout:serializeBilling']();
    eventHandlers['checkout:enableButton']();
    await Promise.resolve();

    eventHandlers['checkout:updateCheckoutView']({}, undefined);

    expect(billing.handleUpdateCheckoutView).toHaveBeenLastCalledWith(undefined, false);
    expect(recovery.controller.requireCardRecovery).not.toHaveBeenCalled();
  });

  it('restores Place Order after selecting card from a guarded Review page', async() => {
    const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
    const jquery = jest.fn((target: unknown) => {
      if (target === document) {
        return {
          ready: (callback: () => Promise<void>) => {
            void callback();
          },
        };
      }
      if (target === 'body') {
        return {
          on: (eventName: string, handler: (...args: unknown[]) => void) => {
            eventHandlers[eventName] = handler;
          },
        };
      }
      if (target === '.payment-information') {
        return { data: () => 'AirwallexCreditCard' };
      }
      if (target === '.place-order') {
        const placeOrderButton = document.querySelector<HTMLElement>('.place-order');
        return {
          hide: () => {
            if (placeOrderButton) placeOrderButton.style.display = 'none';
          },
          show: () => {
            if (placeOrderButton) placeOrderButton.style.display = '';
          },
        };
      }
      return { hide: jest.fn(), show: jest.fn() };
    });
    Object.defineProperty(window, '$', { configurable: true, value: jquery });
    Object.defineProperty(window, 'MutationObserver', {
      configurable: true,
      value: jest.fn(() => ({ observe: jest.fn() })),
    });
    document.body.innerHTML = `
      <div id="checkout-main" data-checkout-stage="placeOrder"></div>
      <input
        class="awx-payment-method-radio"
        type="radio"
        value="AirwallexCreditCard"
        data-content="#credit-card-content"
        data-pane="#credit-card-pane"
        checked
      />
      <button class="place-order">Place Order</button>
    `;
    const billing = jest.requireMock('../billing') as {
      handleCheckoutStageChange: jest.Mock;
      hasPendingCardPayment: jest.Mock;
      renderCard: jest.Mock;
    };
    const recovery = jest.requireMock('../recovery') as {
      controller: {
        recoverReview: jest.Mock;
        shouldHidePlaceOrder: jest.Mock;
      };
    };
    const helpers = jest.requireMock('../billing/helpers') as {
      displayError: jest.Mock;
    };
    const express = jest.requireMock('../../express/index') as {
      checkoutSurface: { render: jest.Mock; destroy: jest.Mock };
    };
    Object.defineProperty(window, 'i18nResources', {
      configurable: true,
      value: { paymentFailed: 'Payment failed' },
    });
    billing.handleCheckoutStageChange.mockReturnValue(true);
    billing.hasPendingCardPayment.mockReturnValue(false);
    billing.renderCard.mockRejectedValue(new Error('Card render failed'));
    recovery.controller.recoverReview.mockReturnValue(false);
    recovery.controller.shouldHidePlaceOrder.mockReturnValue(true);

    init();
    await waitForInit();

    expect(helpers.displayError).toHaveBeenCalledWith('Payment failed');
    expect(express.checkoutSurface.render).not.toHaveBeenCalled();
    expect(express.checkoutSurface.destroy).toHaveBeenCalledTimes(1);
    const placeOrderButton = document.querySelector<HTMLElement>('.place-order')!;
    expect(placeOrderButton.style.display).toBe('none');

    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'payment');
    eventHandlers['checkout:serializeBilling']();
    document.getElementById('checkout-main')?.setAttribute('data-checkout-stage', 'placeOrder');
    billing.hasPendingCardPayment.mockReturnValue(true);

    eventHandlers['checkout:updateCheckoutView']({}, { order: {} });

    expect(placeOrderButton.style.display).not.toBe('none');
  });

  it('hides Express Checkout on Review and restores it when returning to billing', async() => {
    const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
    let observerCallback: MutationCallback | undefined;
    const jquery = jest.fn((target: unknown) => {
      if (target === document) {
        return {
          ready: (callback: () => Promise<void>) => {
            void callback();
          },
        };
      }
      if (target === 'body') {
        return {
          on: (eventName: string, handler: (...args: unknown[]) => void) => {
            eventHandlers[eventName] = handler;
          },
        };
      }
      if (target === '.payment-information') {
        return { data: () => 'AirwallexOnline' };
      }
      return { hide: jest.fn(), show: jest.fn() };
    });
    Object.defineProperty(window, '$', { configurable: true, value: jquery });
    Object.defineProperty(window, 'MutationObserver', {
      configurable: true,
      value: jest.fn((callback: MutationCallback) => {
        observerCallback = callback;
        return { observe: jest.fn() };
      }),
    });
    document.body.innerHTML = `
      <div id="checkout-main" data-checkout-stage="payment">
        <div id="awx-express-checkout">
          <div id="awx-apple-pay"></div>
          <div id="awx-google-pay"></div>
        </div>
      </div>
      <input
        class="awx-payment-method-radio"
        type="radio"
        value="AirwallexOnline"
        data-content="#lpm-content"
        data-pane="#lpm-pane"
        checked
      />
    `;
    const billing = jest.requireMock('../billing') as {
      handleCheckoutStageChange: jest.Mock;
    };
    const express = jest.requireMock('../../express/index') as {
      checkoutSurface: { render: jest.Mock; destroy: jest.Mock };
    };
    billing.handleCheckoutStageChange.mockReturnValue(false);

    init();
    await waitForInit();

    const container = document.getElementById('awx-express-checkout')!;
    expect(express.checkoutSurface.render).toHaveBeenCalledTimes(1);
    expect(express.checkoutSurface.destroy).not.toHaveBeenCalled();
    expect(container.hidden).toBe(false);

    const checkoutMain = document.getElementById('checkout-main')!;
    checkoutMain.setAttribute('data-checkout-stage', 'placeOrder');
    observerCallback?.(
      [{ attributeName: 'data-checkout-stage', target: checkoutMain } as unknown as MutationRecord],
      {} as MutationObserver,
    );

    expect(express.checkoutSurface.destroy).toHaveBeenCalledTimes(1);
    expect(container.hidden).toBe(true);

    checkoutMain.setAttribute('data-checkout-stage', 'payment');
    observerCallback?.(
      [{ attributeName: 'data-checkout-stage', target: checkoutMain } as unknown as MutationRecord],
      {} as MutationObserver,
    );

    expect(express.checkoutSurface.render).toHaveBeenCalledTimes(2);
    expect(container.hidden).toBe(false);

    express.checkoutSurface.destroy.mockClear();
    eventHandlers['checkout:serializeBilling']();
    checkoutMain.setAttribute('data-checkout-stage', 'placeOrder');
    observerCallback?.(
      [{ attributeName: 'data-checkout-stage', target: checkoutMain } as unknown as MutationRecord],
      {} as MutationObserver,
    );
    expect(express.checkoutSurface.destroy).not.toHaveBeenCalled();

    eventHandlers['checkout:updateCheckoutView']({}, { order: {} });
    expect(express.checkoutSurface.destroy).toHaveBeenCalledTimes(1);
    expect(container.hidden).toBe(true);
  });
});
