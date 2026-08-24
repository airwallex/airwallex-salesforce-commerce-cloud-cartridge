/**
 * Handle Processor - Payment form validation and PI creation
 * Handles the initial payment setup phase
 */

import PaymentIntent from '@/cartridge/scripts/airwallex/models/PaymentIntent';
import logger from '@/cartridge/scripts/helpers/logger';
import basketHelper from '@/cartridge/scripts/helpers/basketHelper';
import paymentHelper from '@/cartridge/scripts/helpers/paymentHelper';
import {
  buildPaymentIntentCreateParams,
  cleanupStalePaymentIntent,
  validatePaymentIntentState,
} from '@/cartridge/scripts/helpers/paymentIntentValidation';
import { APP_NAME, PAYMENT_METHOD_ID } from '@/cartridge/scripts/constants/appConfig';
import { PAYMENT_INTENT_STATUS } from '@/cartridge/scripts/constants/paymentStatus';
import type { HandleResult, PaymentInformation } from '../types';
import Basket = require('dw/order/Basket');
import OrderMgr = require('dw/order/OrderMgr');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

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
  const existingPiId = basketHelper.getPaymentIntentId(basket);
  const cachedValidation = existingPiId ? validatePaymentIntentState(basket, appName, existingPiId) : null;
  if (cachedValidation?.status === 'valid') {
    const cachedPi = cachedValidation.paymentIntent;
    logger.info('Reusing existing PaymentIntent', { paymentIntentId: cachedPi.id });

    if (!paymentHelper.getBasketPaymentInstrument(basket, paymentMethodId)) {
      paymentHelper.createBasketPaymentInstrument(
        basket,
        basketHelper.getBasketTotal(basket),
        paymentMethodId,
        cachedPi,
      );
    }

    basketHelper.setClientSecret(basket, cachedPi.clientSecret);

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

  if (cachedValidation?.status === 'unavailable') {
    logger.error('Unable to validate existing PaymentIntent', { paymentIntentId: existingPiId });
    return {
      fieldErrors: {},
      serverErrors: ['Unable to validate existing payment. Please try again.'],
      error: true,
    };
  }

  if (
    cachedValidation?.status === 'stale' &&
    cachedValidation.paymentIntent &&
    cachedValidation.paymentIntent.status !== PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD
  ) {
    logger.error('Existing PaymentIntent is not safe to replace', {
      paymentIntentId: cachedValidation.paymentIntent.id,
      status: cachedValidation.paymentIntent.status,
    });
    return {
      fieldErrors: {},
      serverErrors: ['Unable to replace existing payment. Please try again.'],
      error: true,
    };
  }

  if (cachedValidation?.status === 'stale') {
    cleanupStalePaymentIntent(basket, paymentMethodId, cachedValidation.paymentIntent);
  } else {
    cleanupStalePaymentIntent(basket, paymentMethodId);
  }

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
  const createParams = buildPaymentIntentCreateParams(basket, reservedOrderNo, appName);

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
    basketHelper.setClientSecret(basket, paymentIntent.clientSecret);

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

export { handle };
