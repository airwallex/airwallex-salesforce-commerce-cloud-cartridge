export {};

jest.mock(
  '@/cartridge/scripts/airwallex/models/PaymentIntent',
  () => ({
    __esModule: true,
    default: {
      create: jest.fn(),
      getById: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/logger',
  () => ({
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/configHelper',
  () => ({
    __esModule: true,
    default: {
      getAutoCapture: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/orderHelper',
  () => ({
    __esModule: true,
    default: {
      getPaymentIntentId: jest.fn(),
      getOrderTotal: jest.fn(),
      buildOrderMetadata: jest.fn(),
      setPaymentIntentId: jest.fn(),
      setPaymentStatus: jest.fn(),
      updateOrderPayment: jest.fn(),
      updateOrderPaymentStatus: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentHelper',
  () => ({
    __esModule: true,
    default: {
      getAirwallexPaymentInstrument: jest.fn(),
      setCaptureStatus: jest.fn(),
      setAuthorizationStatus: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentIntentValidation',
  () => ({
    getMerchantWebsiteUrl: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/appConfig',
  () => ({
    APP_NAME: {
      CARD: 'credit_card',
      APM: 'apm',
    },
    PAYMENT_METHOD_ID: {
      APM: 'AirwallexOnline',
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
      REQUIRES_CUSTOMER_ACTION: 'REQUIRES_CUSTOMER_ACTION',
      REQUIRES_CAPTURE: 'REQUIRES_CAPTURE',
      SUCCEEDED: 'SUCCEEDED',
      CANCELLED: 'CANCELLED',
      PENDING: 'PENDING',
    },
  }),
  { virtual: true },
);
jest.mock('dw/order/OrderMgr', () => ({ getOrder: jest.fn() }));
jest.mock('dw/web/URLUtils', () => ({
  abs: jest.fn(() => ({
    toString: jest.fn(() => 'https://shop.example/Airwallex-ReturnFromPayment'),
  })),
}));

const PaymentIntent = require('@/cartridge/scripts/airwallex/models/PaymentIntent').default;
const configHelper = require('@/cartridge/scripts/helpers/configHelper').default;
const orderHelper = require('@/cartridge/scripts/helpers/orderHelper').default;
const paymentHelper = require('@/cartridge/scripts/helpers/paymentHelper').default;
const paymentIntentValidation = require('@/cartridge/scripts/helpers/paymentIntentValidation');
const OrderMgr = require('dw/order/OrderMgr');
const { authorize } = require('../authorize');

const order = { orderNo: 'order-123', currencyCode: 'AUD' };
const paymentInstrument = { UUID: 'pi-1' };
const paymentProcessor = { ID: 'AIRWALLEX_CREDIT' };
const createdPaymentIntent = {
  id: 'int_new',
  clientSecret: 'secret_new',
  status: 'REQUIRES_PAYMENT_METHOD',
  capturedAmount: 100,
  currency: 'AUD',
  nextAction: { url: 'https://pay.example/redirect' },
};

describe('payment authorize middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OrderMgr.getOrder.mockReturnValue(order);
    orderHelper.getOrderTotal.mockReturnValue(100);
    orderHelper.buildOrderMetadata.mockReturnValue({ orderNo: 'order-123' });
    configHelper.getAutoCapture.mockReturnValue(true);
    paymentIntentValidation.getMerchantWebsiteUrl.mockReturnValue('https://shop.example');
    PaymentIntent.create.mockReturnValue(createdPaymentIntent);
    paymentHelper.getAirwallexPaymentInstrument.mockReturnValue(paymentInstrument);
  });

  describe('Card Element create', () => {
    beforeEach(() => {
      orderHelper.getPaymentIntentId.mockReturnValue(null);
    });

    it('creates a PaymentIntent with the storefront origin', () => {
      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(PaymentIntent.create).toHaveBeenCalledWith({
        appName: 'credit_card',
        amount: 100,
        currency: 'AUD',
        orderId: 'order-123',
        returnUrl: 'https://shop.example/Airwallex-ReturnFromPayment',
        merchantWebsiteUrl: 'https://shop.example',
        metadata: { orderNo: 'order-123' },
        paymentMethodOptions: {
          card: {
            auto_capture: true,
          },
        },
      });
      expect(orderHelper.setPaymentIntentId).toHaveBeenCalledWith(order, 'int_new');
      expect(orderHelper.setPaymentStatus).toHaveBeenCalledWith(order, 'REQUIRES_PAYMENT_METHOD');
      expect(result).toEqual({
        error: false,
        authorized: false,
        paymentIntentId: 'int_new',
        clientSecret: 'secret_new',
        requiresConfirmation: true,
      });
    });

    it('returns an error when PaymentIntent creation fails', () => {
      PaymentIntent.create.mockReturnValue(null);

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(result).toEqual({
        error: true,
        errorMessage: 'Failed to create payment. Please try again.',
      });
      expect(orderHelper.setPaymentIntentId).not.toHaveBeenCalled();
    });
  });

  describe('existing PaymentIntent', () => {
    beforeEach(() => {
      orderHelper.getPaymentIntentId.mockReturnValue('int_existing');
    });

    it('returns an error when the PaymentIntent cannot be loaded', () => {
      PaymentIntent.getById.mockReturnValue(null);

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(result).toEqual({
        error: true,
        errorMessage: 'Payment not found. Please try again.',
      });
    });

    it('marks the order authorized when the PaymentIntent has succeeded', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'SUCCEEDED',
      });

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(orderHelper.updateOrderPayment).toHaveBeenCalledWith(
        order,
        'int_existing',
        'SUCCEEDED',
        'int_existing',
        100,
      );
      expect(paymentHelper.setCaptureStatus).toHaveBeenCalledWith(paymentInstrument, 100, 'AUD');
      expect(result).toEqual({ error: false, authorized: true });
    });

    it('skips capture status when no matching payment instrument exists', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'SUCCEEDED',
      });
      paymentHelper.getAirwallexPaymentInstrument.mockReturnValue(null);

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(paymentHelper.setCaptureStatus).not.toHaveBeenCalled();
      expect(result).toEqual({ error: false, authorized: true });
    });

    it('marks the order authorized when capture is still required', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'REQUIRES_CAPTURE',
      });

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(orderHelper.updateOrderPayment).toHaveBeenCalledWith(
        order,
        'int_existing',
        'REQUIRES_CAPTURE',
        'int_existing',
      );
      expect(paymentHelper.setAuthorizationStatus).toHaveBeenCalledWith(paymentInstrument, true);
      expect(result).toEqual({ error: false, authorized: true });
    });

    it('skips authorization status when no matching payment instrument exists for capture', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'REQUIRES_CAPTURE',
      });
      paymentHelper.getAirwallexPaymentInstrument.mockReturnValue(null);

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(paymentHelper.setAuthorizationStatus).not.toHaveBeenCalled();
      expect(result).toEqual({ error: false, authorized: true });
    });

    it('returns the next-action URL when customer action is required', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'REQUIRES_CUSTOMER_ACTION',
      });

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(result).toEqual({
        error: false,
        authorized: false,
        redirectUrl: 'https://pay.example/redirect',
      });
    });

    it.each(['CANCELLED', 'REQUIRES_PAYMENT_METHOD'])(
      'returns an error when the PaymentIntent status is %s',
      status => {
        PaymentIntent.getById.mockReturnValue({
          ...createdPaymentIntent,
          id: 'int_existing',
          status,
        });

        const result = authorize('order-123', paymentInstrument, paymentProcessor);

        expect(result).toEqual({
          error: true,
          errorMessage: 'Payment was cancelled or failed. Please try again.',
        });
      },
    );

    it('returns an error for an unexpected PaymentIntent status', () => {
      PaymentIntent.getById.mockReturnValue({
        ...createdPaymentIntent,
        id: 'int_existing',
        status: 'PENDING',
      });

      const result = authorize('order-123', paymentInstrument, paymentProcessor);

      expect(result).toEqual({
        error: true,
        errorMessage: 'Payment is in an unexpected state. Please contact support.',
      });
    });
  });
});
