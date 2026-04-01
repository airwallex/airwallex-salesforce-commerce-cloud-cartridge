import applePayClient from '../api/applePay';
import logger from '../../helpers/logger';

import type { Request, Response, NextFunction } from 'express';
import UUIDUtils = require('dw/util/UUIDUtils');

interface FormData {
  form: {
    validationURL: string;
    origin: string;
  };
}

const applePaySession = (req: Request & FormData, res: Response, next: NextFunction) => {
  try {
    const { validationURL, origin } = req.form;

    if (!validationURL) {
      res.json({ error: true, message: 'Missing validationURL' });
      return next();
    }

    const initiativeContext = origin ? origin.replace('https://', '').replace('http://', '') : '';

    const result = applePayClient.startSession({
      validation_url: validationURL,
      initiative_context: initiativeContext,
      request_id: UUIDUtils.createUUID(),
    });

    if (!result.success || !result.data) {
      logger.error('Failed to start Apple Pay session', { error: result.error });
      res.json({ error: true, message: result.error?.message || 'Failed to start Apple Pay session' });
      return next();
    }

    res.json(result.data);
    return next();
  } catch (e) {
    const error = e as Error;
    logger.error('Apple Pay session exception', error);
    res.json({ error: true, message: error.message || 'An unexpected error occurred' });
    return next();
  }
};

export default applePaySession;
