import type { Order, CardPaymentError, OrderAddress } from '../../../types';
import { clearError, displayError, generateBilling } from './helpers';
import { cardState, updateCardSummary } from './card';
import { renderDropIn, destroyDropIn } from './dropIn';
import { removeQuote } from '../../utils/quote';
import { validateCardPaymentIntent } from './validation';

interface BaseConfirmParams {
  paymentIntentId: string;
  clientSecret: string;
  continueUrl: string;
  billingAddress: OrderAddress;
  orderEmail: string;
}

interface CardPlaceOrderRecovery {
  isCardReview: () => boolean;
  recoverConfirmationFailure?: (reason: 'declined' | 'failed') => boolean;
  recoverReview: () => boolean;
}

let pendingCardPayment: BaseConfirmParams | null = null;
let confirmationPromise: Promise<boolean> | null = null;

const setPlaceOrderDisabled = (isDisabled: boolean): void => {
  const placeOrderButton = document.querySelector<HTMLButtonElement>('.place-order');
  if (placeOrderButton) {
    placeOrderButton.disabled = isDisabled;
  }
};

const getCardholderName = (billingAddress: OrderAddress): string =>
  [billingAddress.firstName, billingAddress.lastName].filter(Boolean).join(' ');

const getCardPaymentError = (error: unknown): CardPaymentError | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const cardError = error as CardPaymentError;
  return cardError.response?.data ?? cardError;
};

const getErrorMessage = (error: unknown): string => {
  const cardError = getCardPaymentError(error);
  if (cardError?.code === 'risk_declined') {
    return window.i18nResources.paymentDeclined;
  }
  return cardError?.message ?? window.i18nResources.paymentFailed;
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const clearPendingCardPayment = (): void => {
  pendingCardPayment = null;
  if (!confirmationPromise) {
    setPlaceOrderDisabled(false);
  }
};

export const hasPendingCardPayment = (): boolean => pendingCardPayment !== null;

const performPendingCardConfirmation = async(recovery?: CardPlaceOrderRecovery): Promise<boolean> => {
  const context = pendingCardPayment;
  if (!context) return false;

  window.location.hash = '#placeOrder';
  setPlaceOrderDisabled(true);
  clearError();
  let hasStartedConfirmation = false;

  try {
    const cardElement = cardState.cardNumber?.element;
    if (!cardElement) {
      throw new Error('Card element does not exist');
    }

    window.$.spinner().start();
    const validation = await validateCardPaymentIntent(context.paymentIntentId);
    if (pendingCardPayment !== context) {
      if (pendingCardPayment) {
        setPlaceOrderDisabled(false);
      }
      return true;
    }
    if (validation.status === 'stale') {
      clearPendingCardPayment();
      recovery?.recoverReview();
      return true;
    }
    if (validation.status !== 'valid') {
      if (recovery?.recoverConfirmationFailure?.('failed')) {
        return true;
      }
      throw new Error(window.i18nResources.paymentFailed);
    }

    hasStartedConfirmation = true;
    await cardElement.confirm({
      intent_id: context.paymentIntentId,
      client_secret: context.clientSecret,
      payment_method: {
        card: {
          name: getCardholderName(context.billingAddress),
        },
        billing: generateBilling(context.billingAddress, context.orderEmail),
      },
      payment_method_options: {
        card: { auto_capture: window.airwallexConfig.autoCapture },
      },
    });
    window.location.href = context.continueUrl;
  } catch (error: unknown) {
    const cardError = getCardPaymentError(error);
    const recoveryReason = cardError?.code === 'risk_declined' ? 'declined' : 'failed';
    if (hasStartedConfirmation && recovery?.recoverConfirmationFailure?.(recoveryReason)) {
      return true;
    }
    displayError(getErrorMessage(error));
    setPlaceOrderDisabled(false);
  } finally {
    window.$.spinner().stop();
  }

  return true;
};

export const confirmPendingCardPayment = (recovery?: CardPlaceOrderRecovery): Promise<boolean> => {
  if (!confirmationPromise) {
    confirmationPromise = performPendingCardConfirmation(recovery).finally(() => {
      confirmationPromise = null;
    });
  }

  return confirmationPromise;
};

const handleCardPlaceOrderClick = (event: Event, recovery?: CardPlaceOrderRecovery): boolean => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.place-order') || !pendingCardPayment) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  void confirmPendingCardPayment(recovery);
  return true;
};

export const setupCardPlaceOrderInterception = (recovery?: CardPlaceOrderRecovery): (() => void) => {
  const listener = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (confirmationPromise && target.closest('.edit-button, .next-step-button button')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const isMissingCardConfirmation =
      !pendingCardPayment &&
      target.closest('.place-order') &&
      (recovery?.isCardReview() ??
        document.querySelector(
          '[data-awx-card-summary], input.awx-payment-method-radio[value="AirwallexCreditCard"]:checked',
        ) !== null);
    if (isMissingCardConfirmation) {
      event.preventDefault();
      event.stopPropagation();
      recovery?.recoverReview();
      return;
    }

    handleCardPlaceOrderClick(event, recovery);
  };

  document.addEventListener('click', listener, true);
  return () => document.removeEventListener('click', listener, true);
};

const handleCheckoutViewPlaceOrder = (order: Order | null | undefined): void => {
  const instruments = order?.billing?.payment?.selectedPaymentInstruments;
  if (!Array.isArray(instruments) || instruments.length === 0) {
    clearPendingCardPayment();
    return;
  }

  const paymentInstrument = instruments[0];
  const billingAddress = order?.billing?.billingAddress?.address;
  const orderEmail = order?.orderEmail;

  if (paymentInstrument.paymentMethod === 'AirwallexOnline') {
    clearPendingCardPayment();
    renderDropIn({
      paymentIntentId: paymentInstrument.awxPaymentIntentId,
      clientSecret: paymentInstrument.awxPaymentIntentClientSecret,
      currency: paymentInstrument.awxCurrency,
      continueUrl: paymentInstrument.awxContinueUrl,
      billingAddress: billingAddress as OrderAddress,
      orderEmail: orderEmail as string,
    });
  } else if (paymentInstrument.paymentMethod === 'AirwallexCreditCard') {
    if (
      !isNonEmptyString(paymentInstrument.awxPaymentIntentId) ||
      !isNonEmptyString(paymentInstrument.awxPaymentIntentClientSecret) ||
      !isNonEmptyString(paymentInstrument.awxContinueUrl) ||
      !billingAddress ||
      !isNonEmptyString(orderEmail)
    ) {
      clearPendingCardPayment();
      return;
    }
    pendingCardPayment = {
      paymentIntentId: paymentInstrument.awxPaymentIntentId,
      clientSecret: paymentInstrument.awxPaymentIntentClientSecret,
      continueUrl: paymentInstrument.awxContinueUrl,
      billingAddress,
      orderEmail,
    };
    setPlaceOrderDisabled(true);
    updateCardSummary();
  } else {
    clearPendingCardPayment();
  }
};

const handleExitPayment = () => {
  destroyDropIn();
  removeQuote();
};

// Triggered when user submits the form
export const handleUpdateCheckoutView = (
  order: Order | null | undefined,
  isBillingSubmission = new URLSearchParams(window.location.search).get('stage') === 'payment',
): void => {
  if (isBillingSubmission) {
    handleCheckoutViewPlaceOrder(order);
  }
};

// Triggered when stage changes (including after form submit).
// When the user navigates away without submitting (e.g. Edit button), only this fires.
export const handleCheckoutStageChange = (newStage: string): boolean => {
  if (newStage === 'placeOrder') {
    if (!pendingCardPayment) {
      return false;
    }
    updateCardSummary();
    setPlaceOrderDisabled(false);
    return true;
  }

  handleExitPayment();
  clearPendingCardPayment();
  return true;
};
