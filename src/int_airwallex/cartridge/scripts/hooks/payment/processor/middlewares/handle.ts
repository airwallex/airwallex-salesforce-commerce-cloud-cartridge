/**
 * Handle Processor - Payment form validation and PI creation
 * Handles the initial payment setup phase
 */

import PaymentIntent from '@/cartridge/scripts/airwallex/models/PaymentIntent';
import logger from '@/cartridge/scripts/helpers/logger';
import basketHelper from '@/cartridge/scripts/helpers/basketHelper';
import paymentHelper from '@/cartridge/scripts/helpers/paymentHelper';
import { APP_NAME, AppName, PAYMENT_METHOD_ID } from '@/cartridge/scripts/constants/appConfig';
import type { HandleResult, PaymentInformation } from '../types';
import Basket = require('dw/order/Basket');
import OrderMgr = require('dw/order/OrderMgr');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

const buildReturnUrl = (): string => {
  return URLUtils.abs('Airwallex-ReturnFromPayment').toString();
};

/**
 * Build the full set of params that are passed to PaymentIntent.create().
 * Used for both creating a new PI and computing the fingerprint for cache validation.
 */
const buildCreateParams = (basket: Basket, orderId: string, appName: AppName) => ({
  appName,
  amount: basketHelper.getBasketTotal(basket),
  currency: basketHelper.getBasketCurrency(basket),
  orderId,
  returnUrl: buildReturnUrl(),
  order: basketHelper.buildOrderObject(basket),
  customer: basketHelper.buildCustomerDetails(basket),
  metadata: { basketId: basket.UUID },
});

/**
 * Check if an existing payment intent on basket is still valid.
 * Compares all create-time params against a stored fingerprint.
 * Returns the freshly fetched PI if valid, or null if the cached PI cannot be reused.
 */
const getValidCachedPaymentIntent = (basket: Basket, appName: AppName): PaymentIntent | null => {
  const existingPiId = basketHelper.getPaymentIntentId(basket);
  if (!existingPiId) {
    return null;
  }

  const storedFingerprint = basketHelper.getParamsFingerprint(basket);
  const storedOrderNo = basketHelper.getReservedOrderNo(basket);
  if (!storedFingerprint || !storedOrderNo) {
    return null;
  }

  const currentParams = buildCreateParams(basket, storedOrderNo, appName);
  const currentFingerprint = basketHelper.buildPaymentIntentFingerprint(currentParams);

  if (storedFingerprint !== currentFingerprint) {
    return null;
  }

  const existingPi = PaymentIntent.getById(existingPiId);
  if (!existingPi) {
    return null;
  }

  if (existingPi.isFinalState) {
    return null;
  }

  return existingPi;
};

/**
 * Handle payment form validation and PI creation for Drop-in
 * Called during checkout before authorization
 */
const handle = (basket: Basket, paymentInformation: PaymentInformation, paymentMethodId: string): HandleResult => {
  logger.info('Payment handle called', {
    basketId: basket.UUID,
    paymentInformation,
    paymentMethodId,
  });

  if (paymentMethodId !== PAYMENT_METHOD_ID.APM && paymentMethodId !== PAYMENT_METHOD_ID.CARD) {
    return {
      fieldErrors: {},
      serverErrors: ['Payment method not supported.'],
      error: true,
    };
  } else {
    return handlePayment(basket, paymentMethodId);
  }
};

/**
 * Handle payment flow
 * Creates PaymentIntent immediately to get client_secret
 */
const handlePayment = (basket: Basket, paymentMethodId: string): HandleResult => {
  const appName = paymentMethodId === PAYMENT_METHOD_ID.APM ? APP_NAME.APM : APP_NAME.CARD;
  // Check if existing PI is still valid (all create params unchanged)
  const cachedPi = getValidCachedPaymentIntent(basket, appName);
  if (cachedPi) {
    logger.info('Reusing existing PaymentIntent', { paymentIntentId: cachedPi.id });

    const redirectUrl = URLUtils.abs('Airwallex-ReturnFromPayment').append('payment_intent_id', cachedPi.id).toString();

    return {
      fieldErrors: {},
      serverErrors: [],
      error: false,
      paymentIntent: {
        id: cachedPi.id,
        clientSecret: cachedPi.clientSecret,
      },
      redirectUrl,
    };
  }

  // Clear any stale payment data
  basketHelper.clearAirwallexData(basket);

  // Reserve order number for this payment
  let reservedOrderNo: string;
  try {
    reservedOrderNo = OrderMgr.createOrderNo();
  } catch (e) {
    logger.error('Failed to reserve order number', { error: e });
    return {
      fieldErrors: {},
      serverErrors: ['Failed to reserve order number'],
      error: true,
    };
  }

  // Build request data (same structure used for fingerprint comparison)
  const createParams = buildCreateParams(basket, reservedOrderNo, appName);

  // Create PaymentIntent
  const paymentIntent = PaymentIntent.create(createParams);

  if (!paymentIntent) {
    logger.error('Failed to create PaymentIntent for Drop-in');
    return {
      fieldErrors: {},
      serverErrors: ['Failed to create payment. Please try again.'],
      error: true,
    };
  }

  // Store PI data and params fingerprint on basket
  const fingerprint = basketHelper.buildPaymentIntentFingerprint(createParams);
  Transaction.wrap(() => {
    basketHelper.setPaymentIntentId(basket, paymentIntent.id);
    basketHelper.setReservedOrderNo(basket, reservedOrderNo);
    basketHelper.setParamsFingerprint(basket, fingerprint);

    // Create payment instrument on basket
    paymentHelper.createBasketPaymentInstrument(
      basket,
      basketHelper.getBasketTotal(basket),
      paymentMethodId,
      paymentIntent,
    );
  });

  // Build redirect URL for frontend to use after onSuccess
  const redirectUrl = URLUtils.abs('Airwallex-ReturnFromPayment')
    .append('basket_id', basket.getUUID())
    .append('payment_intent_id', paymentIntent.id)
    .toString();

  logger.info('PaymentIntent created', {
    paymentIntentId: paymentIntent.id,
    basketId: basket.getUUID(),
    reservedOrderNo,
    amount: createParams.amount,
    currency: createParams.currency,
    redirectUrl,
  });

  return {
    fieldErrors: {},
    serverErrors: [],
    error: false,
    paymentIntent: {
      id: paymentIntent.id,
      clientSecret: paymentIntent.clientSecret,
    },
    redirectUrl,
  };
};

export { handle, getValidCachedPaymentIntent };
