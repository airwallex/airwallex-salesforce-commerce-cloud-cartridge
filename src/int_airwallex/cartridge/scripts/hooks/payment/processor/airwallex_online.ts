import middlewares from './middlewares/index';
import type Basket from 'dw/order/Basket';
import type OrderPaymentInstrument from 'dw/order/OrderPaymentInstrument';
import type PaymentProcessor from 'dw/order/PaymentProcessor';
import type { HandleResult, PaymentInformation } from '@/cartridge/scripts/hooks/payment/processor/types';

const Handle = (basket: Basket, paymentInformation: PaymentInformation, paymentMethodId: string): HandleResult => {
  return middlewares.handle(basket, paymentInformation, paymentMethodId);
};

function Authorize(orderNumber: string, paymentInstrument: OrderPaymentInstrument, paymentProcessor: PaymentProcessor) {
  return middlewares.authorize(orderNumber, paymentInstrument, paymentProcessor);
}

exports.Handle = Handle;
exports.Authorize = Authorize;
