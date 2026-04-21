import type { Order, CardPaymentError, OrderAddress } from '../../../types';
import { displayError, generateBilling } from './helpers';
import { cardState } from './card';
import { renderDropIn, destroyDropIn } from './dropIn';
import { removeQuote } from '../../utils/quote';

interface BaseConfirmParams {
  clientSecret: string;
  continueUrl: string;
  billingAddress: OrderAddress;
  orderEmail: string;
}

const confirmCardPayment = async({
  clientSecret,
  continueUrl,
  billingAddress,
  orderEmail,
}: BaseConfirmParams): Promise<void> => {
  window.location.hash = '#placeOrder';

  try {
    const cardElement = cardState.cardNumber?.element;
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
    displayError((error as CardPaymentError).message ?? window.i18nResources.paymentFailed);
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

// Triggered when user submits the form
export const handleUpdateCheckoutView = (order: Order): void => {
  const searchParams = new URLSearchParams(window.location.search);
  const currStage = searchParams.get('stage') as string;
  if (currStage === 'payment') {
    handleCheckoutViewPlaceOrder(order);
  }
};

// Triggered when stage changes (including after form submit).
// When the user navigates away without submitting (e.g. Edit button), only this fires.
export const handleCheckoutStageChange = (newStage: string): void => {
  if (newStage !== 'placeOrder') {
    handleExitPayment();
  }
};
