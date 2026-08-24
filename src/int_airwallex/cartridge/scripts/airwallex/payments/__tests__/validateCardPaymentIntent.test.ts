export {};

const mockGetCurrentBasket = jest.fn();
const mockValidateCardPaymentIntent = jest.fn();
const mockCleanupStalePaymentIntent = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('dw/order/BasketMgr', () => ({ getCurrentBasket: mockGetCurrentBasket }), { virtual: true });
jest.mock(
  '@/cartridge/scripts/constants/appConfig',
  () => ({
    PAYMENT_METHOD_ID: {
      CARD: 'AirwallexCreditCard',
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/paymentStatus',
  () => ({
    PAYMENT_INTENT_STATUS: {
      REQUIRES_PAYMENT_METHOD: 'REQUIRES_PAYMENT_METHOD',
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/logger',
  () => ({
    __esModule: true,
    default: {
      info: mockLoggerInfo,
      error: mockLoggerError,
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentIntentValidation',
  () => ({
    validateCardPaymentIntent: mockValidateCardPaymentIntent,
    cleanupStalePaymentIntent: mockCleanupStalePaymentIntent,
  }),
  { virtual: true },
);

import validateCardPaymentIntent from '../validateCardPaymentIntent';

const createResponse = () => ({
  json: jest.fn(),
});
const next = jest.fn();

describe('validate card PaymentIntent middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stale when the current basket or submitted intent is missing', () => {
    const response = createResponse();
    mockGetCurrentBasket.mockReturnValue(null);

    validateCardPaymentIntent({ form: {} } as never, response as never, next);

    expect(response.json).toHaveBeenCalledWith({ status: 'stale' });
    expect(mockValidateCardPaymentIntent).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns valid without exposing PaymentIntent data', () => {
    const basket = { UUID: 'basket-123' };
    const response = createResponse();
    mockGetCurrentBasket.mockReturnValue(basket);
    mockValidateCardPaymentIntent.mockReturnValue({
      status: 'valid',
      paymentIntent: { id: 'int_123', clientSecret: 'secret-sensitive' },
    });

    validateCardPaymentIntent({ form: { paymentIntentId: 'int_123' } } as never, response as never, next);

    expect(response.json).toHaveBeenCalledWith({ status: 'valid' });
    expect(response.json.mock.calls[0][0]).not.toHaveProperty('clientSecret');
  });

  it('cleans stale state and returns stale', () => {
    const basket = { UUID: 'basket-123' };
    const paymentIntent = { id: 'int_123', status: 'REQUIRES_PAYMENT_METHOD' };
    const response = createResponse();
    mockGetCurrentBasket.mockReturnValue(basket);
    mockValidateCardPaymentIntent.mockReturnValue({
      status: 'stale',
      reason: 'amount_mismatch',
      paymentIntent,
    });

    validateCardPaymentIntent({ form: { paymentIntentId: 'int_123' } } as never, response as never, next);

    expect(mockCleanupStalePaymentIntent).toHaveBeenCalledWith(basket, 'AirwallexCreditCard', paymentIntent);
    expect(response.json).toHaveBeenCalledWith({ status: 'stale' });
  });

  it('does not clear a newer basket intent when an old tab submits a mismatched ID', () => {
    const basket = { UUID: 'basket-123' };
    const response = createResponse();
    mockGetCurrentBasket.mockReturnValue(basket);
    mockValidateCardPaymentIntent.mockReturnValue({
      status: 'stale',
      reason: 'intent_id_mismatch',
    });

    validateCardPaymentIntent({ form: { paymentIntentId: 'int_old' } } as never, response as never, next);

    expect(mockCleanupStalePaymentIntent).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ status: 'stale' });
  });

  it('fails closed without cleanup when Airwallex validation is unavailable', () => {
    const basket = { UUID: 'basket-123' };
    const response = createResponse();
    mockGetCurrentBasket.mockReturnValue(basket);
    mockValidateCardPaymentIntent.mockReturnValue({
      status: 'unavailable',
      reason: 'payment_intent_unavailable',
    });

    validateCardPaymentIntent({ form: { paymentIntentId: 'int_123' } } as never, response as never, next);

    expect(mockCleanupStalePaymentIntent).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ status: 'unavailable' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['SUCCEEDED', 'REQUIRES_CAPTURE', 'REQUIRES_CUSTOMER_ACTION'])(
    'does not clean up a %s PaymentIntent even when another mismatch is reported first',
    status => {
      const basket = { UUID: 'basket-123' };
      const paymentIntent = { id: 'int_123', status };
      const response = createResponse();
      mockGetCurrentBasket.mockReturnValue(basket);
      mockValidateCardPaymentIntent.mockReturnValue({
        status: 'stale',
        reason: 'amount_mismatch',
        paymentIntent,
      });

      validateCardPaymentIntent({ form: { paymentIntentId: 'int_123' } } as never, response as never, next);

      expect(mockCleanupStalePaymentIntent).not.toHaveBeenCalled();
      expect(response.json).toHaveBeenCalledWith({ status: 'stale' });
    },
  );

  it('fails closed when validation throws', () => {
    const response = createResponse();
    mockGetCurrentBasket.mockImplementation(() => {
      throw new Error('basket unavailable');
    });

    validateCardPaymentIntent({ form: { paymentIntentId: 'int_123' } } as never, response as never, next);

    expect(mockCleanupStalePaymentIntent).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ status: 'unavailable' });
    expect(mockLoggerError).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
