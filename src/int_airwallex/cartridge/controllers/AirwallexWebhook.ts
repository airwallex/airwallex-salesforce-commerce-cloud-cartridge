/**
 * Airwallex Webhook Controller
 * Handles incoming webhook events from Airwallex
 */

import server from 'server';
import logger from '../scripts/helpers/logger';
import { verifyWebhookRequest } from '../scripts/airwallex/util/signatureHelper';
import WebhookEvent from '../scripts/airwallex/models/WebhookEvent';
import { enqueueWebhookEvent } from '../scripts/helpers/webhookQueueHelper';
import type { NextFunction, Request, Response } from 'express';

/**
 * Handle incoming webhook events
 * POST /AirwallexWebhook-Notify
 */
server.post('Notify', server.middleware.https, (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as string;

    // Verify webhook signature synchronously
    const verification = verifyWebhookRequest(req, payload);

    if (!verification.valid) {
      logger.warn('Webhook verification failed', { error: verification.error });
      res.setStatusCode(401);
      res.json({
        errorMessage: 'Webhook verification failed',
      });
      return next();
    }

    const event = WebhookEvent.parse(payload);

    if (!event) {
      logger.error('Failed to parse webhook event');
      res.setStatusCode(400);
      res.json({
        errorMessage: 'Failed to parse webhook event',
      });
      return next();
    }

    if (!WebhookEvent.isValidPayload(JSON.parse(payload))) {
      logger.error('Invalid webhook payload structure', { eventId: event.id });
      res.setStatusCode(400);
      res.json({
        errorMessage: 'Invalid webhook payload structure',
      });
      return next();
    }

    logger.logWebhook(event.name, event.id, {
      merchantOrderId: event.merchantOrderId,
      paymentIntentId: event.paymentIntentId,
    });

    // Drop events we don't need to process
    if (!WebhookEvent.isProcessableEvent(event)) {
      logger.info('Dropping unrelated webhook event', { eventId: event.id, eventName: event.name });
      res.setStatusCode(200);
      res.json({ success: true });
      return next();
    }

    // Queue event for async processing
    try {
      enqueueWebhookEvent(event, payload);
    } catch (queueError) {
      logger.error('Failed to queue webhook event', queueError as Error);
      res.setStatusCode(500);
      res.json({
        errorMessage: 'Failed to queue webhook event',
      });
      return next();
    }

    res.setStatusCode(200);
    res.json({ success: true });
  } catch (e) {
    logger.error('Webhook processing error', e as Error);
    res.setStatusCode(500);
    res.json({
      errorMessage: 'Webhook processing error',
    });
  }

  return next();
});

module.exports = server.exports();
