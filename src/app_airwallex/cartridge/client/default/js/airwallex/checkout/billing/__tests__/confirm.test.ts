jest.mock('../dropIn', () => ({
  renderDropIn: jest.fn(),
  destroyDropIn: jest.fn(),
}));

jest.mock('../helpers', () => ({
  ...jest.requireActual<typeof import('../helpers')>('../helpers'),
  clearError: jest.fn(),
  displayError: jest.fn(),
}));

jest.mock('../../../utils/quote', () => ({
  removeQuote: jest.fn(),
}));

jest.mock('../validation', () => ({
  validateCardPaymentIntent: jest.fn(),
}));

import type { Order } from '../../../../types';
import { cardState } from '../card';
import {
  confirmPendingCardPayment,
  hasPendingCardPayment,
  handleCheckoutStageChange,
  handleUpdateCheckoutView,
  setupCardPlaceOrderInterception,
} from '../confirm';
import { renderDropIn } from '../dropIn';
import { displayError } from '../helpers';
import { validateCardPaymentIntent } from '../validation';

const createPaymentMethod = jest.fn();
const confirm = jest.fn();
const spinnerStart = jest.fn();
const spinnerStop = jest.fn();
const mockValidateCardPaymentIntent = validateCardPaymentIntent as jest.MockedFunction<
  typeof validateCardPaymentIntent
>;
const waitForClickHandler = () => new Promise(resolve => setTimeout(resolve, 0));

const billingAddress = {
  address1: '123 Main Street',
  address2: '',
  city: 'Melbourne',
  stateCode: 'VIC',
  postalCode: '3000',
  countryCode: {
    value: 'AU',
    displayValue: 'Australia',
  },
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '0400000000',
};

const createOrder = (paymentMethod: string, firstName = 'Test', lastName = 'Shopper'): Order =>
  ({
    billing: {
      payment: {
        selectedPaymentInstruments: [
          {
            paymentMethod,
            awxPaymentIntentId: 'int_123',
            awxPaymentIntentClientSecret: 'secret_123',
            awxCurrency: 'AUD',
            awxContinueUrl: '#return',
          },
        ],
      },
      billingAddress: {
        address: {
          ...billingAddress,
          firstName,
          lastName,
        },
      },
    },
    orderEmail: 'shopper@example.com',
  }) as unknown as Order;

describe('Credit Card confirmation on Place Order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createPaymentMethod.mockReset();
    confirm.mockReset();
    mockValidateCardPaymentIntent.mockResolvedValue({ status: 'valid' });
    cardState.brand = null;
    window.history.replaceState({}, '', '/checkout?stage=payment');
    document.body.innerHTML = `
      <div id="checkout-main">
        <div class="payment-summary">
          <button class="edit-button">Edit payment</button>
        </div>
        <button class="place-order">Place Order</button>
        <div id="awx-card-error"></div>
      </div>
    `;

    Object.defineProperty(window, '$', {
      configurable: true,
      value: Object.assign(jest.fn(), {
        spinner: jest.fn(() => ({
          start: spinnerStart,
          stop: spinnerStop,
        })),
      }),
    });
    Object.defineProperty(window, 'airwallexConfig', {
      configurable: true,
      value: {
        autoCapture: true,
      },
    });
    Object.defineProperty(window, 'i18nResources', {
      configurable: true,
      value: {
        card: 'Card',
        paymentFailed: 'Payment failed',
        paymentDeclined: 'Payment was declined. Please try another card or payment method.',
      },
    });

    cardState.cardNumber = {
      element: {
        createPaymentMethod,
        confirm,
      } as never,
      container: document.createElement('div'),
      complete: true,
    };
  });

  afterEach(() => {
    handleCheckoutStageChange('payment');
  });

  it.each([
    ['guest', 'Guest', 'Shopper'],
    ['registered', 'Registered', 'Shopper'],
  ])('defers %s shopper confirmation until Place Order', (_shopperType, firstName, lastName) => {
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard', firstName, lastName));

    expect(createPaymentMethod).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();

    expect(handleCheckoutStageChange('placeOrder')).toBe(true);

    expect(confirm).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(false);
  });

  it('requires a fresh Billing submission after Back or Edit clears pending state', () => {
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    expect(hasPendingCardPayment()).toBe(true);
    expect(handleCheckoutStageChange('placeOrder')).toBe(true);

    handleCheckoutStageChange('payment');

    expect(hasPendingCardPayment()).toBe(false);
    expect(handleCheckoutStageChange('placeOrder')).toBe(false);
    expect(confirm).not.toHaveBeenCalled();

    window.history.replaceState({}, '', '/checkout?stage=payment');
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));

    expect(handleCheckoutStageChange('placeOrder')).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('handles repeated Review stage events without confirming immediately', () => {
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));

    expect(handleCheckoutStageChange('placeOrder')).toBe(true);
    expect(handleCheckoutStageChange('placeOrder')).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('arms confirmation when the Billing response arrives after the URL advances to Review', () => {
    window.history.replaceState({}, '', '/checkout?stage=placeOrder');

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'), true);

    expect(hasPendingCardPayment()).toBe(true);
    expect(handleCheckoutStageChange('placeOrder')).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('repairs incomplete SFCC card details before showing Review', () => {
    cardState.brand = 'visa';
    document.body.innerHTML = `
      <button class="place-order">Place Order</button>
      <div class="payment-details">
        <span>Credit undefined</span>
        <div>null</div>
        <div><span>Ending undefined/undefined</span></div>
      </div>
    `;

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));

    const paymentDetails = document.querySelector('.payment-details');
    expect(paymentDetails?.querySelector('.credit-card-type')?.textContent).toBe('Card');
    expect(paymentDetails?.querySelector('[data-awx-card-brand]')?.textContent).toBe('Visa');
    expect(paymentDetails?.textContent).not.toContain('undefined');
    expect(paymentDetails?.textContent).not.toContain('null');
  });

  it.each([true, false])('confirms the prepared PaymentIntent with autoCapture=%s', async autoCapture => {
    confirm.mockImplementation(function(this: unknown) {
      expect(this).toBe(cardState.cardNumber?.element);
      return Promise.resolve({ status: 'SUCCEEDED' });
    });
    Object.defineProperty(window, 'airwallexConfig', {
      configurable: true,
      value: {
        autoCapture,
      },
    });

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard', 'Billy', 'Zou'));
    handleCheckoutStageChange('placeOrder');
    await confirmPendingCardPayment();

    expect(confirm).toHaveBeenCalledWith({
      intent_id: 'int_123',
      client_secret: 'secret_123',
      payment_method: {
        card: {
          name: 'Billy Zou',
        },
        billing: {
          email: 'shopper@example.com',
          first_name: 'Billy',
          last_name: 'Zou',
          address: {
            city: 'Melbourne',
            country_code: 'AU',
            postcode: '3000',
            state: 'VIC',
            street: '123 Main Street',
          },
        },
      },
      payment_method_options: {
        card: {
          auto_capture: autoCapture,
        },
      },
    });
    expect(window.location.hash).toBe('#return');
  });

  it('coalesces duplicate confirmation attempts while one is active', async() => {
    let resolveConfirmation: ((value: { status: string }) => void) | undefined;
    confirm.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveConfirmation = resolve;
        }),
    );

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    const firstConfirmation = confirmPendingCardPayment();
    const duplicateConfirmation = confirmPendingCardPayment();

    expect(firstConfirmation).toBe(duplicateConfirmation);
    await waitForClickHandler();
    expect(mockValidateCardPaymentIntent).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(true);

    resolveConfirmation?.({ status: 'SUCCEEDED' });
    await firstConfirmation;
  });

  it('does not confirm a stale intent and recovers through Billing', async() => {
    const recoverReview = jest.fn(() => true);
    const recovery = { isCardReview: jest.fn(() => true), recoverReview };
    mockValidateCardPaymentIntent.mockResolvedValue({ status: 'stale' });
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');

    await confirmPendingCardPayment(recovery);

    expect(confirm).not.toHaveBeenCalled();
    expect(hasPendingCardPayment()).toBe(false);
    expect(recoverReview).toHaveBeenCalledTimes(1);
  });

  it('fails closed and allows retry when validation is unavailable', async() => {
    mockValidateCardPaymentIntent
      .mockResolvedValueOnce({ status: 'unavailable' })
      .mockResolvedValueOnce({ status: 'valid' });
    confirm.mockResolvedValue({ status: 'SUCCEEDED' });
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');

    await confirmPendingCardPayment();

    expect(confirm).not.toHaveBeenCalled();
    expect(hasPendingCardPayment()).toBe(true);
    expect(displayError).toHaveBeenCalledWith('Payment failed');
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(false);

    await confirmPendingCardPayment();

    expect(mockValidateCardPaymentIntent).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('returns to Billing when validation is unavailable and recovery is wired', async() => {
    const recoverConfirmationFailure = jest.fn(() => true);
    mockValidateCardPaymentIntent.mockResolvedValue({ status: 'unavailable' });
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');

    await confirmPendingCardPayment({
      isCardReview: jest.fn(() => true),
      recoverReview: jest.fn(() => true),
      recoverConfirmationFailure,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(recoverConfirmationFailure).toHaveBeenCalledWith('failed');
    expect(displayError).not.toHaveBeenCalled();
  });

  it('does not confirm an old intent when checkout state changes during validation', async() => {
    let resolveValidation: ((result: { status: 'valid' }) => void) | undefined;
    mockValidateCardPaymentIntent.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveValidation = resolve;
        }),
    );
    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    const confirmation = confirmPendingCardPayment();

    handleCheckoutStageChange('payment');
    resolveValidation?.({ status: 'valid' });
    await confirmation;

    expect(hasPendingCardPayment()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('intercepts Place Order before the SFRA handler', async() => {
    confirm.mockResolvedValue({ status: 'SUCCEEDED' });
    const sfraPlaceOrderHandler = jest.fn();
    document.body.addEventListener('click', sfraPlaceOrderHandler);
    const removeInterception = setupCardPlaceOrderInterception();

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    document.querySelector<HTMLButtonElement>('.place-order')?.click();

    await waitForClickHandler();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(sfraPlaceOrderHandler).not.toHaveBeenCalled();

    removeInterception();
    document.body.removeEventListener('click', sfraPlaceOrderHandler);
  });

  it('blocks Place Order and requests recovery when card confirmation state is missing', () => {
    handleCheckoutStageChange('payment');
    window.history.replaceState({}, '', '/checkout?stage=placeOrder');
    document.body.insertAdjacentHTML('beforeend', '<div data-awx-card-summary></div>');
    const sfraPlaceOrderHandler = jest.fn();
    const recoverReview = jest.fn(() => false);
    const isCardReview = jest.fn(() => true);
    document.body.addEventListener('click', sfraPlaceOrderHandler);
    const removeInterception = setupCardPlaceOrderInterception({ isCardReview, recoverReview });

    document.querySelector<HTMLButtonElement>('.place-order')?.click();

    expect(isCardReview).toHaveBeenCalledTimes(1);
    expect(recoverReview).toHaveBeenCalledTimes(1);
    expect(sfraPlaceOrderHandler).not.toHaveBeenCalled();

    removeInterception();
    document.body.removeEventListener('click', sfraPlaceOrderHandler);
  });

  it('keeps Place Order guarded before recovery wiring is installed', () => {
    handleCheckoutStageChange('payment');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<input class="awx-payment-method-radio" value="AirwallexCreditCard" type="radio" checked />',
    );
    const sfraPlaceOrderHandler = jest.fn();
    document.body.addEventListener('click', sfraPlaceOrderHandler);
    const removeInterception = setupCardPlaceOrderInterception();

    document.querySelector<HTMLButtonElement>('.place-order')?.click();

    expect(sfraPlaceOrderHandler).not.toHaveBeenCalled();

    removeInterception();
    document.body.removeEventListener('click', sfraPlaceOrderHandler);
  });

  it('blocks conflicting navigation while confirmation is active', async() => {
    let resolveConfirmation: ((value: { status: string }) => void) | undefined;
    confirm.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveConfirmation = resolve;
        }),
    );
    const editHandler = jest.fn();
    document.body.addEventListener('click', editHandler);
    const removeInterception = setupCardPlaceOrderInterception();

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    const confirmation = confirmPendingCardPayment();
    await waitForClickHandler();
    document.querySelector<HTMLButtonElement>('.edit-button')?.click();

    expect(editHandler).not.toHaveBeenCalled();

    resolveConfirmation?.({ status: 'SUCCEEDED' });
    await confirmation;
    removeInterception();
    document.body.removeEventListener('click', editHandler);
  });

  it('restores Place Order so a failed confirmation can be retried', async() => {
    confirm.mockRejectedValueOnce(new Error('Payment confirmation failed')).mockResolvedValueOnce({
      status: 'SUCCEEDED',
    });
    const navigationHandler = jest.fn();
    document.body.addEventListener('click', navigationHandler);
    const removeInterception = setupCardPlaceOrderInterception();

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    document.querySelector<HTMLButtonElement>('.place-order')?.click();
    await waitForClickHandler();

    expect(displayError).toHaveBeenCalledWith('Payment confirmation failed');
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(false);

    document.querySelector<HTMLButtonElement>('.edit-button')?.click();
    document.querySelector<HTMLButtonElement>('.place-order')?.click();
    await waitForClickHandler();

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(navigationHandler).toHaveBeenCalledTimes(1);

    removeInterception();
    document.body.removeEventListener('click', navigationHandler);
  });

  it('uses the fallback error and restores retry when the SDK rejects without a message', async() => {
    confirm.mockRejectedValue(null);

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    await confirmPendingCardPayment();

    expect(displayError).toHaveBeenCalledWith('Payment failed');
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(false);
  });

  it('returns a generic confirm failure to Billing when recovery is wired', async() => {
    const recoverConfirmationFailure = jest.fn(() => true);
    confirm.mockRejectedValue(new Error('Payment confirmation failed'));

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    await confirmPendingCardPayment({
      isCardReview: jest.fn(() => true),
      recoverReview: jest.fn(() => true),
      recoverConfirmationFailure,
    });

    expect(recoverConfirmationFailure).toHaveBeenCalledWith('failed');
    expect(displayError).not.toHaveBeenCalled();
  });

  it('shows a localized decline message for a nested risk decline response', async() => {
    const recoverConfirmationFailure = jest.fn(() => true);
    confirm.mockRejectedValue({
      response: {
        data: {
          code: 'risk_declined',
          message: 'The transaction is blocked because of risk concern.',
          trace_id: 'trace-sensitive',
          details: {},
        },
      },
    });

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    await confirmPendingCardPayment({
      isCardReview: jest.fn(() => true),
      recoverReview: jest.fn(() => true),
      recoverConfirmationFailure,
    });

    expect(recoverConfirmationFailure).toHaveBeenCalledWith('declined');
    expect(displayError).not.toHaveBeenCalled();
  });

  it('restores checkout when the mounted card element is unavailable', async() => {
    cardState.cardNumber = null;

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    handleCheckoutStageChange('placeOrder');
    await confirmPendingCardPayment();

    expect(displayError).toHaveBeenCalledWith('Card element does not exist');
    expect(document.querySelector<HTMLButtonElement>('.place-order')?.disabled).toBe(false);
  });

  it('ignores unrelated clicks and checkout updates outside Billing', () => {
    const clickHandler = jest.fn();
    document.body.addEventListener('click', clickHandler);
    const removeInterception = setupCardPlaceOrderInterception();
    window.history.replaceState({}, '', '/checkout?stage=placeOrder');

    handleUpdateCheckoutView(createOrder('AirwallexCreditCard'));
    document.querySelector<HTMLButtonElement>('.edit-button')?.click();
    document.dispatchEvent(new Event('click'));

    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();

    removeInterception();
    document.body.removeEventListener('click', clickHandler);
  });

  it('does not prepare confirmation without a supported payment instrument', async() => {
    const orderWithoutInstruments = {
      ...createOrder('AirwallexCreditCard'),
      billing: {
        ...createOrder('AirwallexCreditCard').billing,
        payment: {
          selectedPaymentInstruments: [],
        },
      },
    };

    handleUpdateCheckoutView(orderWithoutInstruments);
    await expect(confirmPendingCardPayment()).resolves.toBe(false);

    handleUpdateCheckoutView(createOrder('OTHER'));
    await expect(confirmPendingCardPayment()).resolves.toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each([
    ['missing order', undefined],
    ['missing billing data', {}],
    [
      'null payment instruments',
      {
        billing: {
          payment: { selectedPaymentInstruments: null },
        },
      },
    ],
    [
      'missing confirmation credentials',
      {
        ...createOrder('AirwallexCreditCard'),
        billing: {
          ...createOrder('AirwallexCreditCard').billing,
          payment: {
            selectedPaymentInstruments: [
              {
                paymentMethod: 'AirwallexCreditCard',
                awxPaymentIntentId: '',
                awxPaymentIntentClientSecret: '',
                awxContinueUrl: '',
              },
            ],
          },
        },
      },
    ],
  ])('does not arm confirmation for a partial checkout payload: %s', (_scenario, order) => {
    expect(() => handleUpdateCheckoutView(order as never)).not.toThrow();
    expect(hasPendingCardPayment()).toBe(false);
    expect(handleCheckoutStageChange('placeOrder')).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('does not intercept or alter the existing local payment method flow', async() => {
    const sfraPlaceOrderHandler = jest.fn();
    document.body.addEventListener('click', sfraPlaceOrderHandler);
    const removeInterception = setupCardPlaceOrderInterception();

    handleUpdateCheckoutView(createOrder('AirwallexOnline'));
    handleCheckoutStageChange('placeOrder');
    document.querySelector<HTMLButtonElement>('.place-order')?.click();

    expect(renderDropIn).toHaveBeenCalledWith({
      paymentIntentId: 'int_123',
      clientSecret: 'secret_123',
      currency: 'AUD',
      continueUrl: '#return',
      billingAddress,
      orderEmail: 'shopper@example.com',
    });
    await expect(confirmPendingCardPayment()).resolves.toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(sfraPlaceOrderHandler).toHaveBeenCalledTimes(1);

    removeInterception();
    document.body.removeEventListener('click', sfraPlaceOrderHandler);
  });

  it('preserves the existing local payment method guard for incomplete runtime data', () => {
    const incompleteOrder = {
      ...createOrder('AirwallexOnline'),
      billing: {
        ...createOrder('AirwallexOnline').billing,
        payment: {
          selectedPaymentInstruments: [
            {
              ...createOrder('AirwallexOnline').billing.payment.selectedPaymentInstruments[0],
              awxCurrency: '',
            },
          ],
        },
      },
    };

    handleUpdateCheckoutView(incompleteOrder as never);

    expect(renderDropIn).toHaveBeenCalled();
    expect(hasPendingCardPayment()).toBe(false);
  });
});
