export {};

const mockGetCurrentBasket = jest.fn();
const mockGetTemporaryBasket = jest.fn();
const mockGetPaymentIntentId = jest.fn();
const mockGetById = jest.fn();
const mockProcessPaymentReturn = jest.fn();
const mockProcessPendingPaymentReturn = jest.fn();
const mockGetTemporaryBasketId = jest.fn();
const mockSetTemporaryBasketId = jest.fn();
const mockCleanupStalePaymentIntent = jest.fn();
const mockUrl = jest.fn((...parts: string[]) => ({
  toString: () => parts.join(':'),
}));

jest.mock('dw/order/BasketMgr', () => ({
  getCurrentBasket: () => mockGetCurrentBasket(),
  getTemporaryBasket: (id: string) => mockGetTemporaryBasket(id),
}));
jest.mock('dw/web/URLUtils', () => ({
  url: (...parts: string[]) => mockUrl(...parts),
}));
jest.mock(
  '@/cartridge/scripts/helpers/logger',
  () => ({
    __esModule: true,
    default: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/basketHelper',
  () => ({
    __esModule: true,
    default: {
      getPaymentIntentId: (basket: unknown) => mockGetPaymentIntentId(basket),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/airwallex/models/PaymentIntent',
  () => ({
    __esModule: true,
    default: {
      getById: (id: string) => mockGetById(id),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/services/checkoutService',
  () => ({
    __esModule: true,
    default: {
      processPaymentReturn: (...args: unknown[]) => mockProcessPaymentReturn(...args),
      processPendingPaymentReturn: (...args: unknown[]) => mockProcessPendingPaymentReturn(...args),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/paymentStatus',
  () => ({
    __esModule: true,
    default: {
      PAYMENT_INTENT_STATUS: {
        SUCCEEDED: 'SUCCEEDED',
        REQUIRES_CAPTURE: 'REQUIRES_CAPTURE',
        REQUIRES_CUSTOMER_ACTION: 'REQUIRES_CUSTOMER_ACTION',
        CANCELLED: 'CANCELLED',
        REQUIRES_PAYMENT_METHOD: 'REQUIRES_PAYMENT_METHOD',
      },
      RETURN_RESULT: {
        SUCCESS: 'success',
        FAILURE: 'failure',
        CANCEL: 'cancel',
        BACK: 'back',
      },
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/errorCodes',
  () => ({
    __esModule: true,
    default: {
      CHECKOUT_ERROR: {
        PAYMENT_FAILED: 'payment_failed',
        PAYMENT_NOT_FOUND: 'payment_not_found',
        PAYMENT_CANCELLED: 'payment_cancelled',
        PAYMENT_ERROR: 'payment_error',
        PROCESSING_ERROR: 'processing_error',
      },
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/appConfig',
  () => ({
    PAYMENT_METHOD_ID: {
      APM: 'AirwallexOnline',
      CARD: 'AirwallexCreditCard',
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentIntentValidation',
  () => ({
    cleanupStalePaymentIntent: (...args: unknown[]) => mockCleanupStalePaymentIntent(...args),
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/expressBasketHelper',
  () => ({
    getTemporaryBasketId: () => mockGetTemporaryBasketId(),
    setTemporaryBasketId: (id: string | null) => mockSetTemporaryBasketId(id),
  }),
  { virtual: true },
);

import returnFromPayment from '../returnFromPayment';

const basket = {
  UUID: 'basket-123',
  getPaymentInstruments: () => [{ paymentMethod: 'AirwallexOnline' }],
};
const next = jest.fn();

const createRequest = (returnResult: string | null = null, checkoutStage: string | false = 'payment') => ({
  session: {
    privacyCache: {
      get: jest.fn((key: string) => (key === 'checkoutStage' ? checkoutStage : false)),
    },
  },
  httpParameterMap: {
    get: jest.fn(() => ({ stringValue: returnResult })),
  },
});

const createResponse = () => ({
  redirect: jest.fn(),
});

describe('returnFromPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemporaryBasketId.mockReturnValue(null);
    mockGetCurrentBasket.mockReturnValue(basket);
    mockGetPaymentIntentId.mockReturnValue('int_123');
  });

  it.each(['SUCCEEDED', 'REQUIRES_CAPTURE'])('places the order when PaymentIntent status is %s', status => {
    const order = { orderNo: 'ORDER-001', orderToken: 'token-1' };
    mockGetById.mockReturnValue({
      id: 'int_123',
      status,
      isSucceeded: status === 'SUCCEEDED',
      requiresCapture: status === 'REQUIRES_CAPTURE',
    });
    mockProcessPaymentReturn.mockReturnValue({ success: true, order });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(mockProcessPaymentReturn).toHaveBeenCalledWith(basket, expect.objectContaining({ status }), {
      fraudDetectionStatus: false,
    });
    expect(response.redirect).toHaveBeenCalledWith('Airwallex-ShowConfirmation:orderNo:ORDER-001:orderToken:token-1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['success', 'success'],
    ['omitted', null],
    ['blank', ''],
  ])('creates a pending order when a wallet return is %s before the PaymentIntent updates', (_label, returnResult) => {
    const order = { orderNo: 'ORDER-001', orderToken: 'token-1' };
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'REQUIRES_CUSTOMER_ACTION',
      isSucceeded: false,
      requiresCapture: false,
      nextAction: { url: 'https://wallet.example/pay' },
    });
    mockProcessPendingPaymentReturn.mockReturnValue({ success: true, order });
    const response = createResponse();

    returnFromPayment(createRequest(returnResult) as never, response as never, next);

    expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
    expect(mockProcessPendingPaymentReturn).toHaveBeenCalledWith(
      basket,
      expect.objectContaining({ status: 'REQUIRES_CUSTOMER_ACTION' }),
      {
        fraudDetectionStatus: false,
      },
    );
    expect(response.redirect).toHaveBeenCalledWith('Airwallex-ShowConfirmation:orderNo:ORDER-001:orderToken:token-1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('redirects to next action when the return result is neither success nor empty', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'REQUIRES_CUSTOMER_ACTION',
      isSucceeded: false,
      requiresCapture: false,
      nextAction: { url: 'https://issuer.example/3ds' },
    });
    const response = createResponse();

    returnFromPayment(createRequest('unknown') as never, response as never, next);

    expect(mockProcessPendingPaymentReturn).not.toHaveBeenCalled();
    expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('https://issuer.example/3ds');
    expect(mockSetTemporaryBasketId).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns to payment when customer action has no continuation URL and the return result is unrecognized', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'REQUIRES_CUSTOMER_ACTION',
      isSucceeded: false,
      requiresCapture: false,
    });
    const response = createResponse();

    returnFromPayment(createRequest('unknown') as never, response as never, next);

    expect(mockProcessPendingPaymentReturn).not.toHaveBeenCalled();
    expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_failed');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['cancel', 'failure', 'back'])(
    'detaches the PaymentIntent when the shopper returns with %s',
    returnResult => {
      const paymentIntent = {
        id: 'int_123',
        status: 'REQUIRES_CUSTOMER_ACTION',
        isSucceeded: false,
        requiresCapture: false,
      };
      const currentBasket = {
        UUID: 'basket-123',
        getPaymentInstruments: () => [{ paymentMethod: 'AirwallexOnline' }],
      };
      mockGetCurrentBasket.mockReturnValue(currentBasket);
      mockGetById.mockReturnValue(paymentIntent);
      const response = createResponse();

      returnFromPayment(createRequest(returnResult) as never, response as never, next);

      expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
      expect(mockCleanupStalePaymentIntent).toHaveBeenCalledWith(currentBasket, 'AirwallexOnline', paymentIntent);
      expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_cancelled');
    },
  );

  it.each(['CANCELLED', 'REQUIRES_PAYMENT_METHOD'])(
    'does not place an order when PaymentIntent status is %s',
    status => {
      mockGetById.mockReturnValue({
        id: 'int_123',
        status,
        isSucceeded: false,
        requiresCapture: false,
      });
      const response = createResponse();

      returnFromPayment(createRequest() as never, response as never, next);

      expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
      expect(mockCleanupStalePaymentIntent).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_cancelled');
    },
  );

  it('sends the shopper to the cart when the return has no basket', () => {
    mockGetCurrentBasket.mockReturnValue(null);
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(response.redirect).toHaveBeenCalledWith('Cart-Show');
    expect(mockGetById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('loads a temporary basket and clears it after a successful return', () => {
    const order = { orderNo: 'ORDER-001', orderToken: 'token-1' };
    const temporaryBasket = { UUID: 'temp-basket' };
    mockGetTemporaryBasketId.mockReturnValue('temp-1');
    mockGetTemporaryBasket.mockReturnValue(temporaryBasket);
    mockGetPaymentIntentId.mockReturnValue('int_123');
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'SUCCEEDED',
      isSucceeded: true,
      requiresCapture: false,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: true, order });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(mockGetTemporaryBasket).toHaveBeenCalledWith('temp-1');
    expect(mockProcessPaymentReturn).toHaveBeenCalledWith(temporaryBasket, expect.any(Object), {
      fraudDetectionStatus: false,
    });
    expect(mockSetTemporaryBasketId).toHaveBeenCalledWith(null);
    expect(response.redirect).toHaveBeenCalledWith('Airwallex-ShowConfirmation:orderNo:ORDER-001:orderToken:token-1');
  });

  it('returns to payment when the basket has no PaymentIntent id', () => {
    mockGetPaymentIntentId.mockReturnValue(null);
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(mockGetById).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_failed');
  });

  it('returns to payment when the PaymentIntent cannot be loaded', () => {
    mockGetById.mockReturnValue(null);
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_not_found');
  });

  it.each(['cancel', 'failure', 'back'])(
    'returns to payment without placing an order when the shopper comes back with %s',
    returnResult => {
      mockGetById.mockReturnValue({
        id: 'int_123',
        status: 'REQUIRES_CUSTOMER_ACTION',
        isSucceeded: false,
        requiresCapture: false,
      });
      const response = createResponse();

      returnFromPayment(createRequest(returnResult) as never, response as never, next);

      expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_cancelled');
    },
  );

  it('still places the order when a cancel return result disagrees with a succeeded PaymentIntent', () => {
    const order = { orderNo: 'ORDER-001', orderToken: 'token-1' };
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'SUCCEEDED',
      isSucceeded: true,
      requiresCapture: false,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: true, order });
    const response = createResponse();

    returnFromPayment(createRequest('cancel') as never, response as never, next);

    expect(mockProcessPaymentReturn).toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Airwallex-ShowConfirmation:orderNo:ORDER-001:orderToken:token-1');
  });

  it('still places the order when a back return result disagrees with a capturable PaymentIntent', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'REQUIRES_CAPTURE',
      isSucceeded: false,
      requiresCapture: true,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: true, order: { orderNo: 'ORDER-002', orderToken: 'token-2' } });
    const response = createResponse();

    returnFromPayment(createRequest('back') as never, response as never, next);

    expect(mockProcessPaymentReturn).toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Airwallex-ShowConfirmation:orderNo:ORDER-002:orderToken:token-2');
  });

  it('returns to payment when order finalization fails', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'SUCCEEDED',
      isSucceeded: true,
      requiresCapture: false,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: false, error: 'payment_failed' });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_failed');
  });

  it('uses a processing error when finalization succeeds without an order', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'SUCCEEDED',
      isSucceeded: true,
      requiresCapture: false,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: true });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:processing_error');
  });

  it('uses a processing error when finalization fails without an error code', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'SUCCEEDED',
      isSucceeded: true,
      requiresCapture: false,
    });
    mockProcessPaymentReturn.mockReturnValue({ success: false });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:processing_error');
  });

  it('returns to payment when the PaymentIntent status is unexpected', () => {
    mockGetById.mockReturnValue({
      id: 'int_123',
      status: 'PENDING',
      isSucceeded: false,
      requiresCapture: false,
    });
    const response = createResponse();

    returnFromPayment(createRequest() as never, response as never, next);

    expect(mockProcessPaymentReturn).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('Checkout-Begin:stage:payment:error:payment_error');
  });

  it('sends an express return to the cart when checkout was never started', () => {
    mockGetPaymentIntentId.mockReturnValue(null);
    const response = createResponse();

    returnFromPayment(createRequest(null, false) as never, response as never, next);

    expect(response.redirect).toHaveBeenCalledWith('Cart-Show');
  });
});
