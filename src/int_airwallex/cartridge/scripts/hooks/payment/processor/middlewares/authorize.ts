/**
 * Authorize Processor - Payment authorization logic
 * Handles payment verification and authorization flows
 */

import logger from '@/cartridge/scripts/helpers/logger';
import configHelper from '@/cartridge/scripts/helpers/configHelper';
import orderHelper from '@/cartridge/scripts/helpers/orderHelper';
import paymentHelper from '@/cartridge/scripts/helpers/paymentHelper';
import { PAYMENT_INTENT_STATUS } from '@/cartridge/scripts/constants/paymentStatus';
import { APP_NAME, PAYMENT_METHOD_ID } from '@/cartridge/scripts/constants/appConfig';
import type { AuthorizeResult } from '../types';
import Order = require('dw/order/Order');
import OrderPaymentInstrument = require('dw/order/OrderPaymentInstrument');
import URLUtils = require('dw/web/URLUtils');
import PaymentIntent from '@/cartridge/scripts/airwallex/models/PaymentIntent';
import PaymentProcessor = require('dw/order/PaymentProcessor');
import OrderMgr = require('dw/order/OrderMgr');

const buildReturnUrl = (): string => {
  return URLUtils.abs('Airwallex-ReturnFromPayment').toString();
};

/**
 * Authorize payment
 * For Drop-in: Verify existing PI status
 * For Card Element: Create PI and return data for frontend confirmation
 */
const authorize = (
  orderNumber: string,
  paymentInstrument: OrderPaymentInstrument,
  paymentProcessor: PaymentProcessor,
): AuthorizeResult => {
  logger.info('Payment authorize called', { orderNo: orderNumber, paymentInstrument, paymentProcessor });

  const order = OrderMgr.getOrder(orderNumber);

  // Check if PI already exists (from Drop-in flow via basket data)
  // Note: PI ID should be transferred from basket during order creation
  const paymentIntentId = orderHelper.getPaymentIntentId(order);

  if (!paymentIntentId) {
    // FLOW B: Card Element / LPMs - Create PI now
    return authorizeCardElement(order);
  }

  // FLOW A: Apm - PI already exists, verify status
  return authorizeApm(order, paymentIntentId);
};

/**
 * Authorize Apm flow
 * PI was created in handle, now verify its status
 */
const authorizeApm = (order: Order, paymentIntentId: string): AuthorizeResult => {
  const paymentIntent = PaymentIntent.getById(paymentIntentId);

  if (!paymentIntent) {
    logger.error('PaymentIntent not found', { paymentIntentId });
    return {
      error: true,
      errorMessage: 'Payment not found. Please try again.',
    };
  }

  logger.info('Verifying PaymentIntent status', {
    paymentIntentId,
    status: paymentIntent.status,
  });

  // Update order with payment intent data
  orderHelper.setPaymentIntentId(order, paymentIntentId);
  orderHelper.setPaymentStatus(order, paymentIntent.status);

  // Handle based on status
  switch (paymentIntent.status) {
  case PAYMENT_INTENT_STATUS.SUCCEEDED:
    return handleSucceededStatus(order, paymentIntent, PAYMENT_METHOD_ID.APM);

  case PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE:
    return handleRequiresCaptureStatus(order, paymentIntent, PAYMENT_METHOD_ID.APM);

  case PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION:
    return {
      error: false,
      authorized: false,
      redirectUrl: paymentIntent.nextAction?.url,
    };

  case PAYMENT_INTENT_STATUS.CANCELLED:
  case PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD:
    return {
      error: true,
      errorMessage: 'Payment was cancelled or failed. Please try again.',
    };

  default:
    logger.warn('Unexpected PaymentIntent status', { status: paymentIntent.status });
    return {
      error: true,
      errorMessage: 'Payment is in an unexpected state. Please contact support.',
    };
  }
};

/**
 * Authorize Card Element flow
 * Creates PI and returns data for frontend confirmation
 */
const authorizeCardElement = (order: Order): AuthorizeResult => {
  logger.info('Creating PaymentIntent for Card Element', { orderNo: order.orderNo });

  const amount = orderHelper.getOrderTotal(order);
  const currency = order.currencyCode;
  const autoCapture = configHelper.getAutoCapture();

  // Create PaymentIntent
  const paymentIntent = PaymentIntent.create({
    appName: APP_NAME.CARD,
    amount,
    currency,
    orderId: order.orderNo,
    returnUrl: buildReturnUrl(),
    metadata: orderHelper.buildOrderMetadata(order),
    paymentMethodOptions: {
      card: {
        auto_capture: autoCapture,
      },
    },
  });

  if (!paymentIntent) {
    logger.error('Failed to create PaymentIntent for Card Element');
    return {
      error: true,
      errorMessage: 'Failed to create payment. Please try again.',
    };
  }

  // Store PI data on order
  orderHelper.setPaymentIntentId(order, paymentIntent.id);
  orderHelper.setPaymentStatus(order, paymentIntent.status);

  logger.info('PaymentIntent created for Card Element', {
    paymentIntentId: paymentIntent.id,
    orderNo: order.orderNo,
  });

  // Return PI data for frontend to confirm
  return {
    error: false,
    authorized: false,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.clientSecret,
    requiresConfirmation: true,
  };
};

/**
 * Handle SUCCEEDED status
 */
const handleSucceededStatus = (
  order: Order,
  paymentIntent: PaymentIntent,
  paymentMethodId: string,
): AuthorizeResult => {
  const transactionId = paymentIntent.id;

  // Update order payment status
  orderHelper.updateOrderPayment(
    order,
    paymentIntent.id,
    paymentIntent.status,
    transactionId,
    paymentIntent.capturedAmount,
  );
  orderHelper.updateOrderPaymentStatus(order, paymentIntent.status);

  // Update payment instrument
  const pi = paymentHelper.getAirwallexPaymentInstrument(order, paymentMethodId);
  if (pi) {
    paymentHelper.setCaptureStatus(pi, paymentIntent.capturedAmount, paymentIntent.currency);
  }

  return {
    error: false,
    authorized: true,
  };
};

/**
 * Handle REQUIRES_CAPTURE status
 */
const handleRequiresCaptureStatus = (
  order: Order,
  paymentIntent: PaymentIntent,
  paymentMethodId: string,
): AuthorizeResult => {
  // Manual capture - just mark as authorized
  orderHelper.updateOrderPayment(order, paymentIntent.id, paymentIntent.status, paymentIntent.id);

  const pi = paymentHelper.getAirwallexPaymentInstrument(order, paymentMethodId);
  if (pi) {
    paymentHelper.setAuthorizationStatus(pi, true);
  }

  return {
    error: false,
    authorized: true,
  };
};

export { authorize, authorizeApm, authorizeCardElement, handleSucceededStatus, handleRequiresCaptureStatus };
