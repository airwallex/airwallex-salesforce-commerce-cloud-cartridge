import BasketMgr = require('dw/order/BasketMgr');
import URLUtils = require('dw/web/URLUtils');

import logger from '@/cartridge/scripts/helpers/logger';
import basketHelper from '@/cartridge/scripts/helpers/basketHelper';
import PaymentIntent from '@/cartridge/scripts/airwallex/models/PaymentIntent';
import checkoutService from '@/cartridge/scripts/services/checkoutService';
import paymentStatus from '@/cartridge/scripts/constants/paymentStatus';
import errorCodes from '@/cartridge/scripts/constants/errorCodes';

import type { Request, Response, NextFunction } from 'express';

const { PAYMENT_INTENT_STATUS, RETURN_RESULT } = paymentStatus;
const { CHECKOUT_ERROR } = errorCodes;

/**
 * checkoutStage is set by SFRA's Checkout-Begin controller when a shopper
 * enters the normal checkout flow. Express checkout from the mini-cart
 * bypasses Checkout-Begin entirely, so the session value is absent.
 * Redirecting to Checkout-Begin in that case would crash because the
 * billing/shipping forms were never initialised.
 *
 * Cart-Show is also unsafe here because processPaymentReturn may have
 * already placed the order and consumed the basket, leaving pdict.valid
 * as null. The home page is the safest fallback.
 */
const redirectOnError = (req: Request, res: Response, errorCode: string) => {
  const checkoutStage = req.session.privacyCache.get('checkoutStage');
  logger.error('Redirecting on error', { errorCode, checkoutStage });
  if (checkoutStage) {
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'error', errorCode).toString());
  } else {
    res.redirect(URLUtils.url('Cart-Show').toString());
  }
};

const returnFromPayment = (req: Request, res: Response, next: NextFunction) => {
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
    redirectOnError(req, res, CHECKOUT_ERROR.PAYMENT_FAILED);
    return next();
  }

  const paymentIntent = PaymentIntent.getById(paymentIntentId);

  if (!paymentIntent) {
    logger.error('PaymentIntent not found on return', { paymentIntentId });
    redirectOnError(req, res, CHECKOUT_ERROR.PAYMENT_NOT_FOUND);
    return next();
  }

  logger.info('PaymentIntent status on return', {
    paymentIntentId,
    status: paymentIntent.status,
  });

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
      redirectOnError(req, res, CHECKOUT_ERROR.PAYMENT_CANCELLED);
      return next();
    }
  }

  switch (paymentIntent.status) {
  case PAYMENT_INTENT_STATUS.SUCCEEDED:
  case PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE:
  case PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION: {
    const result = checkoutService.processPaymentReturn(currentBasket, paymentIntent, {
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
      redirectOnError(req, res, result.error || CHECKOUT_ERROR.PROCESSING_ERROR);
    }
    return next();
  }

  case PAYMENT_INTENT_STATUS.CANCELLED:
  case PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD:
    logger.info('Payment was cancelled or requires new payment method', { paymentIntentId });
    redirectOnError(req, res, CHECKOUT_ERROR.PAYMENT_CANCELLED);
    return next();

  default:
    logger.warn('Unexpected payment status on return', { status: paymentIntent.status });
    redirectOnError(req, res, CHECKOUT_ERROR.PAYMENT_ERROR);
    return next();
  }
};

export default returnFromPayment;
