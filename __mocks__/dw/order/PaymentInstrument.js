// Mock for dw/order/PaymentInstrument
class PaymentInstrument {
  constructor(data = {}) {
    this.paymentMethod = data.paymentMethod || '';
    this.paymentTransaction = data.paymentTransaction || {};
    this.custom = data.custom || {};
  }
}

PaymentInstrument.METHOD_CREDIT_CARD = 'CREDIT_CARD';
PaymentInstrument.METHOD_GIFT_CERTIFICATE = 'GIFT_CERTIFICATE';

module.exports = PaymentInstrument;
