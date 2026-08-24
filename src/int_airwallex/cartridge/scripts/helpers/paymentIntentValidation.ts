import Basket = require('dw/order/Basket');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

import PaymentIntent from '../airwallex/models/PaymentIntent';
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_INTENT_STATUS } from '../constants/paymentStatus';
import { APP_NAME, AppName, PAYMENT_METHOD_ID } from '../constants/appConfig';
import basketHelper from './basketHelper';
import paymentHelper from './paymentHelper';
import logger from './logger';

type StaleReason =
  | 'intent_id_mismatch'
  | 'missing_basket_state'
  | 'fingerprint_mismatch'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'basket_mismatch'
  | 'merchant_order_mismatch'
  | 'unsafe_status'
  | 'unsafe_attempt'
  | 'payment_instrument_mismatch';

interface ValidPaymentIntentResult {
  status: 'valid';
  paymentIntent: PaymentIntent;
}

interface StalePaymentIntentResult {
  status: 'stale';
  reason: StaleReason;
  paymentIntent?: PaymentIntent;
}

interface UnavailablePaymentIntentResult {
  status: 'unavailable';
  reason: 'payment_intent_unavailable';
}

export type PaymentIntentValidationResult =
  | ValidPaymentIntentResult
  | StalePaymentIntentResult
  | UnavailablePaymentIntentResult;

export const buildPaymentIntentCreateParams = (basket: Basket, orderId: string, appName: AppName) => ({
  appName,
  amount: basketHelper.getBasketTotal(basket),
  currency: basketHelper.getBasketCurrency(basket),
  orderId,
  returnUrl: URLUtils.abs('Airwallex-ReturnFromPayment').toString(),
  order: basketHelper.buildOrderObject(basket),
  customer: basketHelper.buildCustomerDetails(basket),
  metadata: { basketId: basket.UUID },
});

const stale = (reason: StaleReason, paymentIntent?: PaymentIntent): StalePaymentIntentResult => ({
  status: 'stale',
  reason,
  ...(paymentIntent ? { paymentIntent } : {}),
});

const isUnsafeAttempt = (paymentIntent: PaymentIntent): boolean => {
  const attemptStatus = paymentIntent.latestPaymentAttempt?.status;
  return (
    attemptStatus === PAYMENT_ATTEMPT_STATUS.EXPIRED ||
    attemptStatus === PAYMENT_ATTEMPT_STATUS.FAILED ||
    attemptStatus === PAYMENT_ATTEMPT_STATUS.CANCELLED
  );
};

export const validatePaymentIntentState = (
  basket: Basket,
  appName: AppName,
  submittedPaymentIntentId: string,
): PaymentIntentValidationResult => {
  const basketPaymentIntentId = basketHelper.getPaymentIntentId(basket);
  if (!basketPaymentIntentId || basketPaymentIntentId !== submittedPaymentIntentId) {
    return stale('intent_id_mismatch');
  }

  const storedFingerprint = basketHelper.getParamsFingerprint(basket);
  const storedOrderNo = basketHelper.getReservedOrderNo(basket);
  if (!storedFingerprint || !storedOrderNo) {
    return stale('missing_basket_state');
  }

  const currentParams = buildPaymentIntentCreateParams(basket, storedOrderNo, appName);
  const currentFingerprint = basketHelper.buildPaymentIntentFingerprint(currentParams);
  if (storedFingerprint !== currentFingerprint) {
    return stale('fingerprint_mismatch', PaymentIntent.getById(basketPaymentIntentId) ?? undefined);
  }

  const paymentIntent = PaymentIntent.getById(basketPaymentIntentId);
  if (!paymentIntent) {
    return { status: 'unavailable', reason: 'payment_intent_unavailable' };
  }

  if (paymentIntent.amount !== currentParams.amount) {
    return stale('amount_mismatch', paymentIntent);
  }
  if (paymentIntent.currency !== currentParams.currency) {
    return stale('currency_mismatch', paymentIntent);
  }
  if (paymentIntent.metadata?.basketId !== basket.UUID) {
    return stale('basket_mismatch', paymentIntent);
  }
  if (paymentIntent.merchantOrderId !== storedOrderNo) {
    return stale('merchant_order_mismatch', paymentIntent);
  }
  if (paymentIntent.status !== PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD) {
    return stale('unsafe_status', paymentIntent);
  }
  if (isUnsafeAttempt(paymentIntent)) {
    return stale('unsafe_attempt', paymentIntent);
  }

  return { status: 'valid', paymentIntent };
};

export const validateCardPaymentIntent = (
  basket: Basket,
  submittedPaymentIntentId: string,
): PaymentIntentValidationResult => {
  const result = validatePaymentIntentState(basket, APP_NAME.CARD, submittedPaymentIntentId);
  if (result.status !== 'valid') {
    return result;
  }

  const paymentInstrument = paymentHelper.getBasketPaymentInstrument(basket, PAYMENT_METHOD_ID.CARD);
  if (paymentInstrument?.custom.awxPaymentIntentId !== submittedPaymentIntentId) {
    return stale('payment_instrument_mismatch', result.paymentIntent);
  }

  return result;
};

export const cleanupStalePaymentIntent = (
  basket: Basket,
  paymentMethodId: string,
  paymentIntent?: PaymentIntent,
): void => {
  if (paymentIntent?.canCancel) {
    try {
      if (!paymentIntent.cancel('stale_payment_intent')) {
        logger.warn('Unable to cancel stale PaymentIntent', { paymentIntentId: paymentIntent.id });
      }
    } catch {
      logger.warn('Unable to cancel stale PaymentIntent', {
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  Transaction.wrap(() => {
    basketHelper.clearAirwallexData(basket);
    paymentHelper.removeBasketPaymentInstruments(basket, paymentMethodId);
  });
};

const paymentIntentValidation = {
  buildPaymentIntentCreateParams,
  validatePaymentIntentState,
  validateCardPaymentIntent,
  cleanupStalePaymentIntent,
};

module.exports = paymentIntentValidation;
export default paymentIntentValidation;
