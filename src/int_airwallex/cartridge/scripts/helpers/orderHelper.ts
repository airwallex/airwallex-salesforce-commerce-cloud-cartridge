/**
 * Order utilities for SFCC and Airwallex payment integration
 */

import Order = require('dw/order/Order');
import OrderMgr = require('dw/order/OrderMgr');
import Transaction = require('dw/system/Transaction');
import { formatAmount } from './currencyHelper';
import { PAYMENT_INTENT_STATUS, PaymentIntentStatus } from '../constants/paymentStatus';
import { PAYMENT_METHOD_ID } from '../constants/appConfig';
import type PaymentIntent from '../airwallex/models/PaymentIntent';

// Custom attribute keys for Airwallex data stored on order
const ORDER_ATTRS = {
  PAYMENT_INTENT_ID: 'awxPaymentIntentId',
  PAYMENT_STATUS: 'awxPaymentIntentStatus',
  TRANSACTION_ID: 'awxTransactionId',
  CAPTURED_AMOUNT: 'awxCapturedAmount',
  REFUNDED_AMOUNT: 'awxRefundedAmount',
} as const;

/**
 * Get order by order number
 */
const getOrder = (orderNo: string): Order | null => {
  return OrderMgr.getOrder(orderNo);
};

/**
 * Get the order total amount formatted for Airwallex API
 */
const getOrderTotal = (order: Order): number => {
  const total = order.totalGrossPrice;
  return formatAmount(total.value, total.currencyCode);
};

/**
 * Get the payment intent ID stored on the order
 */
const getPaymentIntentId = (order: Order): string | null => {
  const value = order.custom[ORDER_ATTRS.PAYMENT_INTENT_ID];
  return value || null;
};

/**
 * Set the payment intent ID on the order
 */
const setPaymentIntentId = (order: Order, paymentIntentId: string): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.PAYMENT_INTENT_ID] = paymentIntentId;
  });
};

/**
 * Get the payment status stored on the order
 */
const getPaymentStatus = (order: Order): string | null => {
  const value = order.custom[ORDER_ATTRS.PAYMENT_STATUS];
  return value || null;
};

/**
 * Set the payment status on the order
 */
const setPaymentStatus = (order: Order, status: string): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.PAYMENT_STATUS] = status;
  });
};

/**
 * Get the transaction ID stored on the order
 */
const getTransactionId = (order: Order): string | null => {
  const value = order.custom[ORDER_ATTRS.TRANSACTION_ID];
  return value || null;
};

/**
 * Set the transaction ID on the order
 */
const setTransactionId = (order: Order, transactionId: string): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.TRANSACTION_ID] = transactionId;
  });
};

/**
 * Get the captured amount stored on the order
 */
const getCapturedAmount = (order: Order): number => {
  const value = order.custom[ORDER_ATTRS.CAPTURED_AMOUNT];
  return value || 0;
};

/**
 * Set the captured amount on the order
 */
const setCapturedAmount = (order: Order, amount: number): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.CAPTURED_AMOUNT] = amount;
  });
};

/**
 * Get the refunded amount stored on the order
 */
const getRefundedAmount = (order: Order): number => {
  const value = order.custom[ORDER_ATTRS.REFUNDED_AMOUNT];
  return value || 0;
};

/**
 * Set the refunded amount on the order
 */
const setRefundedAmount = (order: Order, amount: number): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.REFUNDED_AMOUNT] = amount;
  });
};

/**
 * Batch update order payment attributes
 */
const updateOrderPayment = (
  order: Order,
  paymentIntentId: string,
  status: string,
  transactionId?: string,
  capturedAmount?: number,
): void => {
  Transaction.wrap(() => {
    order.custom[ORDER_ATTRS.PAYMENT_INTENT_ID] = paymentIntentId;
    order.custom[ORDER_ATTRS.PAYMENT_STATUS] = status;
    if (transactionId) {
      order.custom[ORDER_ATTRS.TRANSACTION_ID] = transactionId;
    }
    if (capturedAmount !== undefined) {
      order.custom[ORDER_ATTRS.CAPTURED_AMOUNT] = capturedAmount;
    }
  });
};

/**
 * Map Airwallex payment intent status to SFCC order payment status
 */
const mapPaymentStatus = (airwallexStatus: PaymentIntentStatus): number => {
  switch (airwallexStatus) {
  case PAYMENT_INTENT_STATUS.SUCCEEDED:
    return Order.PAYMENT_STATUS_PAID;
  case PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE:
    return Order.PAYMENT_STATUS_NOTPAID; // Authorized but not captured
  case PAYMENT_INTENT_STATUS.CANCELLED:
    return Order.PAYMENT_STATUS_NOTPAID;
  case PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD:
  case PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION:
  case PAYMENT_INTENT_STATUS.PENDING:
  case PAYMENT_INTENT_STATUS.PENDING_REVIEW:
  default:
    return Order.PAYMENT_STATUS_NOTPAID;
  }
};

/**
 * Update the SFCC order payment status based on Airwallex status
 */
const updateOrderPaymentStatus = (order: Order, airwallexStatus: PaymentIntentStatus): void => {
  const sfccStatus = mapPaymentStatus(airwallexStatus);
  Transaction.wrap(() => {
    order.setPaymentStatus(sfccStatus);
  });
};

/**
 * Build order metadata for Airwallex API
 */
const buildOrderMetadata = (order: Order): Record<string, string> => {
  return {
    orderNo: order.orderNo,
    sfccOrderId: order.UUID,
  };
};

/**
 * Update order status
 */
const updateOrderStatus = (order: Order, status: number): void => {
  Transaction.wrap(() => {
    order.setStatus(status);
  });
};

/**
 * Update the payment method information on the order's payment instrument
 */
const updatePaymentMethodInformation = (order: Order, paymentIntent: PaymentIntent): void => {
  Transaction.wrap(() => {
    const paymentInstruments = order.getPaymentInstruments();
    const paymentInstrument = paymentInstruments.length > 0 ? paymentInstruments[0] : null;
    if (!paymentInstrument || !paymentIntent.paymentMethodType) {
      return;
    }
    paymentInstrument.custom.awxPaymentMethodType = paymentIntent.paymentMethodType;
    if (paymentInstrument.paymentMethod === PAYMENT_METHOD_ID.CARD) {
      const card = paymentIntent.latestPaymentAttempt?.payment_method?.card;
      if (card) {
        const { last4 = '', bin = '', brand = '' } = card;
        paymentInstrument.setCreditCardType(brand);
        paymentInstrument.setCreditCardNumber(
          Array(bin.length + 4)
            .fill('*')
            .join('') + last4,
        );
      }
    }
  });
};

const orderHelper = {
  getOrder,
  getOrderTotal,
  getPaymentIntentId,
  setPaymentIntentId,
  getPaymentStatus,
  setPaymentStatus,
  getTransactionId,
  setTransactionId,
  getCapturedAmount,
  setCapturedAmount,
  getRefundedAmount,
  setRefundedAmount,
  updateOrderPayment,
  mapPaymentStatus,
  updateOrderPaymentStatus,
  buildOrderMetadata,
  updateOrderStatus,
  updatePaymentMethodInformation,
  ORDER_ATTRS,
};

module.exports = orderHelper;
export default orderHelper;
export {
  getOrder,
  getOrderTotal,
  getPaymentIntentId,
  setPaymentIntentId,
  getPaymentStatus,
  setPaymentStatus,
  getTransactionId,
  setTransactionId,
  getCapturedAmount,
  setCapturedAmount,
  getRefundedAmount,
  setRefundedAmount,
  updateOrderPayment,
  mapPaymentStatus,
  updateOrderPaymentStatus,
  buildOrderMetadata,
  updateOrderStatus,
  ORDER_ATTRS,
};
