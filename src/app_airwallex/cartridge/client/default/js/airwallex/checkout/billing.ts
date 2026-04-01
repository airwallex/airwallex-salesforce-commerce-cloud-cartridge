import type { Payment } from '@airwallex/components-sdk';
import type { SplitCardElement, CardFormState, Order, CardPaymentError, OrderAddress, Quote } from '../../types';
import { displayQuote, removeQuote } from '../utils/quote';

// Module state
const state: CardFormState = {
  cardNumber: null,
  expiry: null,
  cvc: null,
  dropIn: null,
};
// DOM element cache
const getErrorContainer = (): HTMLElement | null => document.getElementById('awx-card-error');

const displayError = (errorMsg: string): void => {
  const container = getErrorContainer();
  if (container) container.textContent = errorMsg;
};

const clearError = (): void => {
  const container = getErrorContainer();
  if (container) container.textContent = '';
};

const generateBilling = (billingAddress: OrderAddress, email: string): Payment.Billing => {
  return {
    email,
    first_name: billingAddress.firstName,
    last_name: billingAddress.lastName,
    address: {
      city: billingAddress.city,
      country_code: billingAddress.countryCode.value,
      postcode: billingAddress.postalCode,
      state: billingAddress.stateCode,
      street: billingAddress.address1,
    },
  };
};

const isCardTabActive = (): boolean =>
  document.querySelector('.credit-card-tab')?.classList.contains('active') ?? false;

const setupElementEvents = (
  element: SplitCardElement | null | undefined,
  container: HTMLDivElement,
  stateKey: keyof CardFormState,
): void => {
  element?.on('change', (e: CustomEvent) => {
    if (state[stateKey]) {
      state[stateKey]!.complete = e.detail.complete;
    }
  });

  element?.on('focus', () => {
    container.classList.add('focused');
    container.classList.remove('error');
    clearError();
  });

  element?.on('blur', e => {
    container.classList.remove('focused');
    if (!state[stateKey]?.complete) {
      container.classList.add('error');
    }
    if (e.detail.error?.message) {
      displayError(e.detail.error.message);
    }
  });
};

const renderCard = async(): Promise<void> => {
  const cardNumberContainer = document.getElementById('airwallex-card-number') as HTMLDivElement;
  const cardExpiryContainer = document.getElementById('airwallex-card-expiry') as HTMLDivElement;
  const cardCvcContainer = document.getElementById('airwallex-card-cvc') as HTMLDivElement;

  const elementStyle = {
    base: {
      '::placeholder': {
        color: '#878E99',
      },
    },
  } as unknown as Payment.InputStyle;
  const cardNumberElement = await window.AirwallexComponentsSDK.createElement('cardNumber', {
    allowedCardNetworks: window.airwallexConfig.cardSchemes as Payment.CardNetwork[],
    placeholder: '1234 1234 1234 1234',
    style: elementStyle,
  });
  const expiryElement = await window.AirwallexComponentsSDK.createElement('expiry', {
    style: elementStyle,
  });
  const cvcElement = await window.AirwallexComponentsSDK.createElement('cvc', {
    placeholder: 'CVC',
    style: elementStyle,
  });

  // Initialize state
  state.cardNumber = { element: cardNumberElement, container: cardNumberContainer, complete: false };
  state.expiry = { element: expiryElement, container: cardExpiryContainer, complete: false };
  state.cvc = { element: cvcElement, container: cardCvcContainer, complete: false };

  // Mount elements
  cardNumberElement?.mount(cardNumberContainer);
  expiryElement?.mount(cardExpiryContainer);
  cvcElement?.mount(cardCvcContainer);

  // Listen to complete events
  cardNumberElement?.on('change', e => {
    // @ts-ignore
    if (e.detail.complete) {
      expiryElement?.focus();
    }
  });
  expiryElement?.on('change', e => {
    // @ts-ignore
    if (e.detail.complete) {
      cvcElement?.focus();
    }
  });

  // Setup event handlers using helper
  setupElementEvents(cardNumberElement, cardNumberContainer, 'cardNumber');
  setupElementEvents(expiryElement, cardExpiryContainer, 'expiry');
  setupElementEvents(cvcElement, cardCvcContainer, 'cvc');
};

const destroyCard = () => {
  state.cardNumber?.element?.destroy();
  state.expiry?.element?.destroy();
  state.cvc?.element?.destroy();
};

interface BaseConfirmParams {
  clientSecret: string;
  continueUrl: string;
  billingAddress: OrderAddress;
  orderEmail: string;
}

interface RenderDropInParams extends BaseConfirmParams {
  paymentIntentId: string;
  currency: string;
}

const renderDropIn = async({
  paymentIntentId,
  clientSecret,
  currency,
  continueUrl,
  billingAddress,
  orderEmail,
}: RenderDropInParams): Promise<void> => {
  $('.place-order').hide();

  const paymentDetails = document.querySelector('.payment-details') as HTMLDivElement;
  paymentDetails.textContent = '';

  const element = await window.AirwallexComponentsSDK.createElement('dropIn', {
    intent_id: paymentIntentId,
    client_secret: clientSecret,
    currency,
    autoCapture: window.airwallexConfig.autoCapture,
    methods: window.airwallexConfig.paymentMethods as Payment.PaymentMethodType[],
    country_code: billingAddress.countryCode.value,
    billing: generateBilling(billingAddress, orderEmail),
    shopper_email: orderEmail,
    shopper_name: `${billingAddress.firstName} ${billingAddress.lastName}`.trim(),
    shopper_phone: billingAddress.phone,
  });

  element?.mount(paymentDetails);

  state.dropIn = { element: element, container: paymentDetails, complete: false };

  // @ts-ignore
  element?.on('quoteCreate', (event: CustomEvent<{ quote: Quote }>) => {
    displayQuote(event.detail.quote);
  });

  element?.on('success', () => {
    window.location.href = continueUrl;
  });
};

const destroyDropIn = () => {
  state.dropIn?.element?.destroy();
};

const confirmCardPayment = async({
  clientSecret,
  continueUrl,
  billingAddress,
  orderEmail,
}: BaseConfirmParams): Promise<void> => {
  window.location.hash = '#placeOrder';

  try {
    const cardElement = state.cardNumber?.element;
    if (!cardElement) {
      throw new Error('Card element does not exist');
    }

    window.$.spinner().start();
    await cardElement.confirm({
      client_secret: clientSecret,
      payment_method: {
        card: { name: 'card' },
        billing: generateBilling(billingAddress, orderEmail),
      },
      payment_method_options: {
        card: { auto_capture: window.airwallexConfig.autoCapture },
      },
    });
    window.location.href = continueUrl;
  } catch (error: unknown) {
    displayError((error as CardPaymentError).message ?? 'Payment failed');
  } finally {
    window.$.spinner().stop();
  }
};

const handleCheckoutViewPlaceOrder = (order: Order): void => {
  const instruments = order.billing.payment.selectedPaymentInstruments;
  if (instruments.length === 0) return;

  const paymentInstrument = instruments[0];

  if (paymentInstrument.paymentMethod === 'AirwallexOnline') {
    renderDropIn({
      paymentIntentId: paymentInstrument.awxPaymentIntentId,
      clientSecret: paymentInstrument.awxPaymentIntentClientSecret,
      currency: paymentInstrument.awxCurrency,
      continueUrl: paymentInstrument.awxContinueUrl,
      billingAddress: order.billing.billingAddress.address,
      orderEmail: order.orderEmail,
    });
  } else if (paymentInstrument.paymentMethod === 'AirwallexCreditCard') {
    confirmCardPayment({
      clientSecret: paymentInstrument.awxPaymentIntentClientSecret,
      continueUrl: paymentInstrument.awxContinueUrl,
      billingAddress: order.billing.billingAddress.address,
      orderEmail: order.orderEmail,
    });
  }
};

const handleExitPayment = () => {
  destroyDropIn();
  removeQuote();
};

// This is triggered only when user submits the form
const handleUpdateCheckoutView = (order: Order): void => {
  const searchParams = new URLSearchParams(window.location.search);
  // Current stage
  const currStage = searchParams.get('stage') as string;
  if (currStage === 'payment') {
    handleCheckoutViewPlaceOrder(order);
  }
};

// This is triggered when stage changes.
// When handleUpdateCheckoutView is triggered, this function is also triggered.
// However, when the user changes the stage without submitting the form (e.g. click the Edit button),
// only this function is triggered.
const handleCheckoutStageChange = (newStage: string): void => {
  if (newStage !== 'placeOrder') {
    handleExitPayment();
  }
};

const validateCardForm = (): void => {
  if (!isCardTabActive()) return;

  const allComplete = state.cardNumber?.complete && state.expiry?.complete && state.cvc?.complete;
  if (!allComplete) {
    displayError('Please complete all the fields.');
    throw new Error('Required fields not completed');
  }
};

export { handleUpdateCheckoutView, handleCheckoutStageChange, renderCard, destroyCard, validateCardForm };
