/**
 * Airwallex Credit Card Payment Processor Hook
 */

import type { HandleResult, PaymentInformation } from '@/cartridge/scripts/hooks/payment/processor/types';
import Basket = require('dw/order/Basket');
import OrderPaymentInstrument = require('dw/order/OrderPaymentInstrument');
import PaymentProcessor = require('dw/order/PaymentProcessor');
import middlewares from './middlewares/index';

const Handle = (basket: Basket, paymentInformation: PaymentInformation, paymentMethodId: string): HandleResult => {
  return middlewares.handle(basket, paymentInformation, paymentMethodId);
};

function Authorize(orderNumber: string, paymentInstrument: OrderPaymentInstrument, paymentProcessor: PaymentProcessor) {
  return middlewares.authorize(orderNumber, paymentInstrument, paymentProcessor);
}

module.exports = {
  Handle,
  Authorize,
};

export { Handle, Authorize };
