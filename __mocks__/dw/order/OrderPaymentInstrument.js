// Mock for dw/order/OrderPaymentInstrument
class OrderPaymentInstrument {
  constructor(data = {}) {
    this.paymentMethod = data.paymentMethod || '';
    this.paymentTransaction = data.paymentTransaction || {
      setTransactionID: jest.fn(),
      setAmount: jest.fn(),
      setPaymentProcessor: jest.fn(),
      type: null,
      amount: null,
      transactionID: null,
    };
    this.custom = data.custom || {};
  }
}

module.exports = OrderPaymentInstrument;
