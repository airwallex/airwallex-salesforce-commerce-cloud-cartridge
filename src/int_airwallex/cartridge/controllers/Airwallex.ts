/**
 * Airwallex Controller
 * Handles client-side API endpoints for payment integration
 */
import BasketMgr = require('dw/order/BasketMgr');
import URLUtils = require('dw/web/URLUtils');
import Basket = require('dw/order/Basket');

import server from 'server';
import middlewares from './middlewares/index';
import basketHelper from '../scripts/helpers/basketHelper';
import logger from '@/cartridge/scripts/helpers/logger';
import PaymentIntent from '@/cartridge/scripts/airwallex/models/PaymentIntent';
import checkoutService from '@/cartridge/scripts/services/checkoutService';
import paymentStatus from '@/cartridge/scripts/constants/paymentStatus';
import errorCodes from '@/cartridge/scripts/constants/errorCodes';
import csrf from '@/cartridge/scripts/middleware/csrf';

import type { NextFunction, Request, Response } from 'express';

const { airwallex } = middlewares;
const { PAYMENT_INTENT_STATUS, RETURN_RESULT } = paymentStatus;
const { CHECKOUT_ERROR } = errorCodes;

/**
 * Show confirmation
 * GET /Airwallex-ShowConfirmation
 */
server.get('ShowConfirmation', server.middleware.https, airwallex.showConfirmation);

/**
 * Get express checkout methods
 * GET /Airwallex-ExpressCheckoutMethods
 */
server.get('ExpressCheckoutMethods', server.middleware.https, airwallex.expressCheckoutMethods);

/**
 * Get shipping options
 * POST /Airwallex-ShippingOptions
 */
server.post('ShippingOptions', server.middleware.https, csrf.validateRequest, airwallex.shippingOptions);

/**
 * Select shipping method
 * POST /Airwallex-SelectShippingMethod
 */
server.post('SelectShippingMethod', server.middleware.https, csrf.validateRequest, airwallex.selectShippingMethod);

/**
 * Express checkout authorization
 * POST /Airwallex-ExpressCheckoutAuthorization
 */
server.post(
  'ExpressCheckoutAuthorization',
  server.middleware.https,
  csrf.validateRequest,
  airwallex.expressCheckoutAuthorization,
);

/**
 * Apple Pay session validation
 * POST /Airwallex-ApplePaySession
 */
server.post('ApplePaySession', server.middleware.https, csrf.validateRequest, airwallex.applePaySession);

/**
 * Handle return from payment
 * GET /Airwallex-ReturnFromPayment
 */
server.get('ReturnFromPayment', server.middleware.https, (req: Request, res: Response, next: NextFunction) => {
  const currentBasket = BasketMgr.getCurrentBasket();

  if (!currentBasket) {
    logger.error('No basket found on payment return');
    res.redirect(URLUtils.url('Cart-Show').toString());
    return next();
  }

  const paymentIntentId = basketHelper.getPaymentIntentId(currentBasket);

  logger.info('ReturnFromPayment called', { paymentIntentId });

  if (!paymentIntentId) {
    logger.error('No payment_intent_id in return URL');
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', CHECKOUT_ERROR.PAYMENT_FAILED).toString());
    return next();
  }

  // Get the payment intent to check status
  const paymentIntent = PaymentIntent.getById(paymentIntentId);

  if (!paymentIntent) {
    logger.error('PaymentIntent not found on return', { paymentIntentId });
    res.redirect(
      URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', CHECKOUT_ERROR.PAYMENT_NOT_FOUND).toString(),
    );
    return next();
  }

  logger.info('PaymentIntent status on return', {
    paymentIntentId,
    status: paymentIntent.status,
  });

  // Short-circuit on awx_return_result from the redirect URL
  const awxReturnResult = req.httpParameterMap.get('awx_return_result').stringValue;
  if (
    awxReturnResult === RETURN_RESULT.FAILURE ||
    awxReturnResult === RETURN_RESULT.CANCEL ||
    awxReturnResult === RETURN_RESULT.BACK
  ) {
    if (paymentIntent.isSucceeded || paymentIntent.requiresCapture) {
      logger.warn('Return result does not match intent status', {
        intentStatus: paymentIntent.status,
        returnResult: awxReturnResult,
      });
    } else {
      logger.info('Payment incomplete, customer returned with result', { returnResult: awxReturnResult });
      res.redirect(
        URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', CHECKOUT_ERROR.PAYMENT_CANCELLED).toString(),
      );
      return next();
    }
  }

  // Handle based on status
  switch (paymentIntent.status) {
  case PAYMENT_INTENT_STATUS.SUCCEEDED:
  case PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE:
  case PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION:
    return handleSuccessfulReturn(req, res, next, paymentIntent, currentBasket);

  case PAYMENT_INTENT_STATUS.CANCELLED:
  case PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD:
    logger.info('Payment was cancelled or requires new payment method', { paymentIntentId });
    res.redirect(
      URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', CHECKOUT_ERROR.PAYMENT_CANCELLED).toString(),
    );
    return next();

  default:
    logger.warn('Unexpected payment status on return', { status: paymentIntent.status });
    res.redirect(
      URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', CHECKOUT_ERROR.PAYMENT_ERROR).toString(),
    );
    return next();
  }
});

/**
 * Handle successful payment return
 */
function handleSuccessfulReturn(
  req: Request,
  res: Response,
  next: NextFunction,
  paymentIntent: InstanceType<typeof PaymentIntent>,
  basket: Basket,
) {
  const result = checkoutService.processPaymentReturn(basket, paymentIntent, {
    fraudDetectionStatus: req.session.privacyCache.get('fraudDetectionStatus'),
  });

  if (result.success && result.order) {
    res.redirect(
      URLUtils.url(
        'Airwallex-ShowConfirmation',
        'orderNo',
        result.order.orderNo,
        'orderToken',
        result.order.orderToken,
      ).toString(),
    );
  } else {
    res.redirect(
      URLUtils.url(
        'Checkout-Begin',
        'stage',
        'payment',
        'error',
        result.error || CHECKOUT_ERROR.PROCESSING_ERROR,
      ).toString(),
    );
  }

  return next();
}

module.exports = server.exports();
