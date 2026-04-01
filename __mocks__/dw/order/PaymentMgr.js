/**
 * Mock for dw/order/PaymentMgr
 */

const mockPaymentProcessor = {
  ID: 'AIRWALLEX_CREDIT',
};

const mockPaymentMethod = {
  ID: 'CREDIT_CARD',
  paymentProcessor: mockPaymentProcessor,
};

const PaymentMgr = {
  getPaymentMethod: jest.fn().mockReturnValue(mockPaymentMethod),
  getApplicablePaymentMethods: jest.fn().mockReturnValue([]),
  getPaymentCard: jest.fn().mockReturnValue(null),
};

module.exports = PaymentMgr;
