/**
 * Payment instrument utilities for SFCC and Airwallex payment integration
 */

import Order = require('dw/order/Order');
import Basket = require('dw/order/Basket');
import OrderPaymentInstrument = require('dw/order/OrderPaymentInstrument');
import PaymentInstrument = require('dw/order/PaymentInstrument');
import PaymentTransaction = require('dw/order/PaymentTransaction');
import Transaction = require('dw/system/Transaction');
import Money = require('dw/value/Money');
import PaymentIntent from '../airwallex/models/PaymentIntent';

export interface PaymentInstrumentData {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

/**
 * Create a payment instrument on a basket
 */
const createBasketPaymentInstrument = (
  basket: Basket,
  amount: number,
  paymentMethodId: string,
  paymentIntent: PaymentIntent,
): PaymentInstrument | null => {
  let paymentInstrument: PaymentInstrument | null = null;

  Transaction.wrap(() => {
    // Remove any existing Airwallex payment instruments first
    basket.removeAllPaymentInstruments();

    // Create new payment instrument
    paymentInstrument = basket.createPaymentInstrument(paymentMethodId, basket.totalGrossPrice);
    paymentInstrument.custom.awxPaymentIntentId = paymentIntent.id;
    paymentInstrument.custom.awxPaymentIntentClientSecret = paymentIntent.clientSecret;
    paymentInstrument.custom.awxPaymentIntentCurrency = paymentIntent.currency;
  });

  return paymentInstrument;
};

/**
 * Get the Airwallex payment instrument from a basket
 */
const getBasketPaymentInstrument = (basket: Basket, paymentMethodId: string): PaymentInstrument | null => {
  const paymentInstruments = basket.getPaymentInstruments(paymentMethodId);
  return paymentInstruments.length > 0 ? paymentInstruments[0] : null;
};

/**
 * Create a payment instrument on an order
 */
const createPaymentInstrument = (
  order: Order,
  data: PaymentInstrumentData,
  paymentMethodId: string,
): OrderPaymentInstrument | null => {
  let paymentInstrument: OrderPaymentInstrument | null = null;

  Transaction.wrap(() => {
    // Remove any existing Airwallex payment instruments first
    removePaymentInstruments(order, paymentMethodId);

    // Create new payment instrument
    paymentInstrument = order.createPaymentInstrument(paymentMethodId, order.totalGrossPrice);

    if (paymentInstrument) {
      // Store payment intent data
      paymentInstrument.custom.awxPaymentIntentId = data.paymentIntentId;
      paymentInstrument.custom.awxPaymentIntentCurrency = data.currency;
    }
  });

  return paymentInstrument;
};

/**
 * Get the Airwallex payment instrument from an order
 */
const getAirwallexPaymentInstrument = (order: Order, paymentMethodId: string): OrderPaymentInstrument | null => {
  const paymentInstruments = order.getPaymentInstruments(paymentMethodId);
  return paymentInstruments.length > 0 ? paymentInstruments[0] : null;
};

/**
 * Remove all Airwallex payment instruments from an order
 */
const removePaymentInstruments = (order: Order, paymentMethodId: string): void => {
  Transaction.wrap(() => {
    const paymentInstruments = order.getPaymentInstruments(paymentMethodId);

    for (let i = 0; i < paymentInstruments.length; i++) {
      order.removePaymentInstrument(paymentInstruments[i]);
    }
  });
};

/**
 * Update the payment instrument with transaction details
 */
const updatePaymentInstrumentTransaction = (
  paymentInstrument: OrderPaymentInstrument | null,
  transactionId: string,
  amount: number,
  currency: string,
): void => {
  if (!paymentInstrument) {
    return;
  }
  Transaction.wrap(() => {
    const paymentTransaction = paymentInstrument.paymentTransaction;
    if (paymentTransaction) {
      paymentTransaction.setTransactionID(transactionId);
      paymentTransaction.setAmount(new Money(amount, currency));
    }
  });
};

/**
 * Set authorization status on payment instrument
 */
const setAuthorizationStatus = (paymentInstrument: OrderPaymentInstrument, authorized: boolean): void => {
  Transaction.wrap(() => {
    const paymentTransaction = paymentInstrument.paymentTransaction;
    if (paymentTransaction && authorized) {
      // Set type to AUTH for authorized transactions
      paymentTransaction.setType(PaymentTransaction.TYPE_AUTH);
    }
  });
};

/**
 * Set capture status on payment instrument
 */
const setCaptureStatus = (paymentInstrument: OrderPaymentInstrument, amount: number, currency: string): void => {
  Transaction.wrap(() => {
    const paymentTransaction = paymentInstrument.paymentTransaction;
    if (paymentTransaction) {
      // Set type to CAPTURE for captured transactions
      paymentTransaction.setType(PaymentTransaction.TYPE_CAPTURE);
      paymentTransaction.setAmount(new Money(amount, currency));
    }
  });
};

/**
 * Update the payment status on an order
 */
const updatePaymentStatus = (order: Order, status: string, paymentMethodId: string, transactionId?: string): void => {
  const paymentInstrument = getAirwallexPaymentInstrument(order, paymentMethodId);

  if (!paymentInstrument) {
    return;
  }

  Transaction.wrap(() => {
    paymentInstrument.custom.awxPaymentIntentStatus = status;

    if (transactionId) {
      const paymentTransaction = paymentInstrument.paymentTransaction;
      if (paymentTransaction) {
        paymentTransaction.setTransactionID(transactionId);
      }
    }
  });
};

const paymentHelper = {
  createBasketPaymentInstrument,
  getBasketPaymentInstrument,
  createPaymentInstrument,
  getAirwallexPaymentInstrument,
  removePaymentInstruments,
  updatePaymentInstrumentTransaction,
  setAuthorizationStatus,
  setCaptureStatus,
  updatePaymentStatus,
};

module.exports = paymentHelper;
export default paymentHelper;
export {
  createBasketPaymentInstrument,
  getBasketPaymentInstrument,
  createPaymentInstrument,
  getAirwallexPaymentInstrument,
  removePaymentInstruments,
  updatePaymentInstrumentTransaction,
  setAuthorizationStatus,
  setCaptureStatus,
  updatePaymentStatus,
};
