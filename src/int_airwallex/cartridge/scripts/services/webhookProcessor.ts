/**
 * Webhook Processor Service
 * Handles processing of webhook events
 */
import OrderMgr = require('dw/order/OrderMgr');
import Transaction = require('dw/system/Transaction');
import Order = require('dw/order/Order');

import { WEBHOOK_EVENTS } from '../airwallex/models/WebhookEvent';
import orderHelper from '../helpers/orderHelper';
import paymentHelper from '../helpers/paymentHelper';
import logger from '../helpers/logger';
import WebhookEvent from '../airwallex/models/WebhookEvent';
import { PAYMENT_INTENT_STATUS, PaymentIntentStatus } from '../constants/paymentStatus';

/**
 * Result of processing a webhook event
 */
export interface ProcessResult {
  success: boolean;
  error?: string;
}

/**
 * Process a webhook event based on its type
 * @param event - The webhook event to process
 * @returns Result indicating success or failure
 */
export const processEvent = (event: WebhookEvent): ProcessResult => {
  const result: ProcessResult = { success: true };

  try {
    logger.info('Processing webhook event', {
      eventId: event.id,
      eventName: event.name,
    });

    const orderId = event.data.object.merchant_order_id as string;
    const order = OrderMgr.getOrder(orderId);
    if (!order) {
      result.success = false;
      result.error = 'Order not found in the webhook event';
      return result;
    }

    const data = event.data.object;
    const paymentInstruments = order.getPaymentInstruments();
    const paymentInstrument = paymentInstruments.length > 0 ? paymentInstruments[0] : null;
    switch (event.name) {
    case WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
      if (order.custom.awxPaymentIntentStatus !== PAYMENT_INTENT_STATUS.SUCCEEDED) {
        const paymentIntentId = data.id as string;
        const paymentIntentStatus = data.status as PaymentIntentStatus;
        const capturedAmount = data.captured_amount as number;
        const currency = data.currency as string;

        orderHelper.updateOrderPayment(order, paymentIntentId, paymentIntentStatus, paymentIntentId, capturedAmount);
        paymentHelper.updatePaymentInstrumentTransaction(
          paymentInstrument,
          paymentIntentId,
          capturedAmount,
          currency,
        );
        orderHelper.updateOrderPaymentStatus(order, paymentIntentStatus);

        Transaction.wrap(() => {
          order.trackOrderChange(`${WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED} event received`);
        });
      }
      break;
    case WEBHOOK_EVENTS.REFUND_ACCEPTED:
      const refundedAmount = data.amount as number;
      const currency = data.currency as string;

      const capturedAmount = orderHelper.getCapturedAmount(order);
      const previousRefundedAmount = orderHelper.getRefundedAmount(order) || 0;
      const newRefundedAmount = previousRefundedAmount + refundedAmount;
      const remainingAmount = capturedAmount - newRefundedAmount;

      orderHelper.setRefundedAmount(order, newRefundedAmount);
      Transaction.wrap(() => {
        if (remainingAmount === 0) {
          order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
        } else if (remainingAmount > 0) {
          order.setPaymentStatus(Order.PAYMENT_STATUS_PARTPAID);
        }
        order.trackOrderChange(
          `${WEBHOOK_EVENTS.REFUND_ACCEPTED} event received, refunded ${refundedAmount} ${currency}`,
        );
      });
      break;
    default:
      // Unhandled event type - log and consider it successful (don't retry)
      logger.info('Unhandled webhook event type', { eventName: event.name });
      break;
    }
  } catch (e) {
    const error = e as Error;
    logger.error('Error processing webhook event', error);
    result.success = false;
    result.error = error.message;
  }

  return result;
};

module.exports = {
  processEvent,
};
