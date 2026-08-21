import BasketMgr = require('dw/order/BasketMgr');

import { PAYMENT_METHOD_ID } from '@/cartridge/scripts/constants/appConfig';
import { PAYMENT_INTENT_STATUS } from '@/cartridge/scripts/constants/paymentStatus';
import {
  cleanupStalePaymentIntent,
  validateCardPaymentIntent as validateCurrentCardPaymentIntent,
} from '@/cartridge/scripts/helpers/paymentIntentValidation';
import logger from '@/cartridge/scripts/helpers/logger';

import type { Request, Response, NextFunction } from 'express';

interface CardPaymentIntentValidationRequest extends Request {
  form: {
    paymentIntentId?: string;
  };
}

const validateCardPaymentIntent = (
  req: CardPaymentIntentValidationRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const basket = BasketMgr.getCurrentBasket();
    const paymentIntentId = req.form?.paymentIntentId;
    if (!basket || !paymentIntentId) {
      res.json({ status: 'stale' });
      next();
      return;
    }

    const result = validateCurrentCardPaymentIntent(basket, paymentIntentId);
    if (result.status !== 'valid') {
      logger.info('Card PaymentIntent validation did not succeed', {
        status: result.status,
        reason: 'reason' in result ? result.reason : undefined,
        paymentIntentId,
        basketId: basket.UUID,
      });
    }

    const hasProgressedIntent =
      result.status === 'stale' &&
      result.paymentIntent &&
      result.paymentIntent.status !== PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD;
    if (result.status === 'stale' && result.reason !== 'intent_id_mismatch' && !hasProgressedIntent) {
      cleanupStalePaymentIntent(basket, PAYMENT_METHOD_ID.CARD, result.paymentIntent);
    }

    res.json({ status: result.status });
    next();
  } catch (e) {
    logger.error('Unable to validate card PaymentIntent', { error: e });
    res.json({ status: 'unavailable' });
    next();
  }
};

export default validateCardPaymentIntent;
