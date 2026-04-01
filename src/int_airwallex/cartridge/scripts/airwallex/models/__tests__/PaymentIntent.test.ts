jest.mock('../../api/paymentIntent', () => ({
  create: jest.fn(),
  get: jest.fn(),
  capture: jest.fn(),
  cancel: jest.fn(),
  generateRequestId: jest.fn().mockReturnValue('req_test_123'),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import PaymentIntent from '../PaymentIntent';
import paymentIntentClient from '../../api/paymentIntent';
import logger from '../../../helpers/logger';
import { PAYMENT_INTENT_STATUS } from '../../../constants/paymentStatus';
import { APP_NAME, VERSION, PLATFORM_IDENTIFIER } from '../../../constants/appConfig';
import type { PaymentIntentResponse } from '../../api/types';

const mockPaymentIntentClient = paymentIntentClient as jest.Mocked<typeof paymentIntentClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

const createMockResponse = (overrides: Partial<PaymentIntentResponse> = {}): PaymentIntentResponse => ({
  id: 'int_test123',
  request_id: 'req_123',
  amount: 100,
  currency: 'USD',
  status: PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD,
  client_secret: 'cs_secret_xyz',
  merchant_order_id: 'order_123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('PaymentIntent Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes all properties from response', () => {
      const response = createMockResponse({
        captured_amount: 50,
        latest_payment_attempt: { id: 'att_123', refunded_amount: 10 },
        metadata: { key: 'value' },
        customer_id: 'cus_123',
        descriptor: 'Test Descriptor',
        connected_account_id: 'acct_123',
        available_payment_method_types: ['card', 'wechatpay'],
        order: { type: 'physical_goods' },
        customer: { first_name: 'John', last_name: 'Doe' },
        next_action: { type: 'redirect', url: 'https://example.com' },
      });

      const pi = new PaymentIntent(response);

      expect(pi.id).toBe('int_test123');
      expect(pi.clientSecret).toBe('cs_secret_xyz');
      expect(pi.amount).toBe(100);
      expect(pi.currency).toBe('USD');
      expect(pi.status).toBe(PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD);
      expect(pi.merchantOrderId).toBe('order_123');
      expect(pi.capturedAmount).toBe(50);
      expect(pi.refundedAmount).toBe(10);
      expect(pi.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(pi.updatedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(pi.metadata).toEqual({ key: 'value' });
      expect(pi.customerId).toBe('cus_123');
      expect(pi.descriptor).toBe('Test Descriptor');
      expect(pi.connectedAccountId).toBe('acct_123');
      expect(pi.availablePaymentMethodTypes).toEqual(['card', 'wechatpay']);
      expect(pi.order).toEqual({ type: 'physical_goods' });
      expect(pi.customer).toEqual({ first_name: 'John', last_name: 'Doe' });
      expect(pi.nextAction).toEqual({ type: 'redirect', url: 'https://example.com' });
    });

    it('defaults captured_amount to 0 when not provided', () => {
      const response = createMockResponse({ captured_amount: undefined });
      const pi = new PaymentIntent(response);
      expect(pi.capturedAmount).toBe(0);
    });

    it('defaults refunded_amount to 0 when latest_payment_attempt not provided', () => {
      const response = createMockResponse({ latest_payment_attempt: undefined });
      const pi = new PaymentIntent(response);
      expect(pi.refundedAmount).toBe(0);
    });

    it('defaults refunded_amount to 0 when latest_payment_attempt.refunded_amount not provided', () => {
      const response = createMockResponse({ latest_payment_attempt: { id: 'att_123' } });
      const pi = new PaymentIntent(response);
      expect(pi.refundedAmount).toBe(0);
    });
  });

  describe('status checks', () => {
    it('requiresPaymentMethod returns true for REQUIRES_PAYMENT_METHOD status', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD }));
      expect(pi.requiresPaymentMethod).toBe(true);
    });

    it('requiresCustomerAction returns true for REQUIRES_CUSTOMER_ACTION status', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION }));
      expect(pi.requiresCustomerAction).toBe(true);
    });

    it('requiresCapture returns true for REQUIRES_CAPTURE status', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE }));
      expect(pi.requiresCapture).toBe(true);
    });

    it('isSucceeded returns true for SUCCEEDED status', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.SUCCEEDED }));
      expect(pi.isSucceeded).toBe(true);
    });

    it('isCancelled returns true for CANCELLED status', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.CANCELLED }));
      expect(pi.isCancelled).toBe(true);
    });

    it('isFinalState returns true for SUCCEEDED', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.SUCCEEDED }));
      expect(pi.isFinalState).toBe(true);
    });

    it('isFinalState returns true for CANCELLED', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.CANCELLED }));
      expect(pi.isFinalState).toBe(true);
    });

    it('isFinalState returns false for non-final states', () => {
      const pi = new PaymentIntent(createMockResponse({ status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE }));
      expect(pi.isFinalState).toBe(false);
    });
  });

  describe('canCapture', () => {
    it('returns true when status is REQUIRES_CAPTURE and has remaining amount', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          amount: 100,
          captured_amount: 0,
        }),
      );
      expect(pi.canCapture).toBe(true);
    });

    it('returns false when status is not REQUIRES_CAPTURE', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.SUCCEEDED,
          amount: 100,
          captured_amount: 0,
        }),
      );
      expect(pi.canCapture).toBe(false);
    });

    it('returns false when fully captured', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          amount: 100,
          captured_amount: 100,
        }),
      );
      expect(pi.canCapture).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('returns true when status is REQUIRES_CAPTURE', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
        }),
      );
      expect(pi.canCancel).toBe(true);
    });

    it('returns false when status is not REQUIRES_CAPTURE', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD,
        }),
      );
      expect(pi.canCancel).toBe(false);
    });

    it('returns false when succeeded', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.SUCCEEDED,
        }),
      );
      expect(pi.canCancel).toBe(false);
    });
  });

  describe('canRefund', () => {
    it('returns true when succeeded and has refundable amount', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.SUCCEEDED,
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 0 },
        }),
      );
      expect(pi.canRefund).toBe(true);
    });

    it('returns false when not succeeded', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 0 },
        }),
      );
      expect(pi.canRefund).toBe(false);
    });

    it('returns false when fully refunded', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.SUCCEEDED,
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 100 },
        }),
      );
      expect(pi.canRefund).toBe(false);
    });
  });

  describe('amount calculations', () => {
    it('remainingAmount calculates correctly', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          amount: 100,
          captured_amount: 30,
        }),
      );
      expect(pi.remainingAmount).toBe(70);
    });

    it('refundableAmount calculates correctly', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 25 },
        }),
      );
      expect(pi.refundableAmount).toBe(75);
    });

    it('isFullyCaptured returns true when fully captured', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          amount: 100,
          captured_amount: 100,
        }),
      );
      expect(pi.isFullyCaptured).toBe(true);
    });

    it('isFullyCaptured returns false when partially captured', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          amount: 100,
          captured_amount: 50,
        }),
      );
      expect(pi.isFullyCaptured).toBe(false);
    });

    it('isFullyRefunded returns true when fully refunded', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 100 },
        }),
      );
      expect(pi.isFullyRefunded).toBe(true);
    });

    it('isFullyRefunded returns false when partially refunded', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          captured_amount: 100,
          latest_payment_attempt: { id: 'att_123', refunded_amount: 50 },
        }),
      );
      expect(pi.isFullyRefunded).toBe(false);
    });
  });

  describe('capture', () => {
    it('captures remaining amount when no amount specified', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          amount: 100,
          captured_amount: 0,
        }),
      );

      mockPaymentIntentClient.capture.mockReturnValue({
        success: true,
        data: createMockResponse({ status: PAYMENT_INTENT_STATUS.SUCCEEDED, captured_amount: 100 }),
        statusCode: 200,
      });

      const result = pi.capture();

      expect(result).not.toBeNull();
      expect(result?.status).toBe(PAYMENT_INTENT_STATUS.SUCCEEDED);
      expect(mockPaymentIntentClient.capture).toHaveBeenCalledWith('int_test123', {
        amount: 100,
        request_id: 'req_test_123',
      });
    });

    it('captures specified amount', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          amount: 100,
          captured_amount: 0,
        }),
      );

      mockPaymentIntentClient.capture.mockReturnValue({
        success: true,
        data: createMockResponse({ captured_amount: 50 }),
        statusCode: 200,
      });

      const result = pi.capture(50);

      expect(mockPaymentIntentClient.capture).toHaveBeenCalledWith('int_test123', {
        amount: 50,
        request_id: 'req_test_123',
      });
      expect(result).not.toBeNull();
    });

    it('returns null when cannot capture', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.SUCCEEDED,
        }),
      );

      const result = pi.capture();

      expect(result).toBeNull();
      expect(mockPaymentIntentClient.capture).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot capture PaymentIntent', expect.any(Object));
    });

    it('returns null when API call fails', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
          amount: 100,
        }),
      );

      mockPaymentIntentClient.capture.mockReturnValue({
        success: false,
        error: { code: 'CAPTURE_FAILED', message: 'Capture failed' },
        statusCode: 400,
      });

      const result = pi.capture();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to capture PaymentIntent', expect.any(Object));
    });
  });

  describe('cancel', () => {
    it('cancels with reason', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
        }),
      );

      mockPaymentIntentClient.cancel.mockReturnValue({
        success: true,
        data: createMockResponse({ status: PAYMENT_INTENT_STATUS.CANCELLED }),
        statusCode: 200,
      });

      pi.cancel('Customer requested');

      expect(mockPaymentIntentClient.cancel).toHaveBeenCalledWith('int_test123', {
        request_id: 'req_test_123',
        cancellation_reason: 'Customer requested',
      });
    });

    it('returns null when cannot cancel (not REQUIRES_CAPTURE)', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD,
        }),
      );

      const result = pi.cancel();

      expect(result).toBeNull();
      expect(mockPaymentIntentClient.cancel).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot cancel PaymentIntent', expect.any(Object));
    });

    it('returns null when API call fails', () => {
      const pi = new PaymentIntent(
        createMockResponse({
          status: PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE,
        }),
      );

      mockPaymentIntentClient.cancel.mockReturnValue({
        success: false,
        error: { code: 'CANCEL_FAILED', message: 'Cancel failed' },
        statusCode: 400,
      });

      const result = pi.cancel();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to cancel PaymentIntent', expect.any(Object));
    });
  });

  describe('refresh', () => {
    it('refreshes payment intent from API', () => {
      const pi = new PaymentIntent(createMockResponse());

      mockPaymentIntentClient.get.mockReturnValue({
        success: true,
        data: createMockResponse({ status: PAYMENT_INTENT_STATUS.SUCCEEDED, captured_amount: 100 }),
        statusCode: 200,
      });

      const result = pi.refresh();

      expect(result).not.toBeNull();
      expect(result?.status).toBe(PAYMENT_INTENT_STATUS.SUCCEEDED);
      expect(mockPaymentIntentClient.get).toHaveBeenCalledWith('int_test123');
    });

    it('returns null when API call fails', () => {
      const pi = new PaymentIntent(createMockResponse());

      mockPaymentIntentClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' },
        statusCode: 404,
      });

      const result = pi.refresh();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to refresh PaymentIntent', expect.any(Object));
    });
  });

  describe('static create', () => {
    it('creates payment intent with required params', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      const result = PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(PaymentIntent);
      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          currency: 'USD',
          merchant_order_id: 'order_123',
          request_id: 'req_test_123',
        }),
      );
    });

    it('always includes platform identifier in metadata', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            platform: PLATFORM_IDENTIFIER,
          }),
        }),
      );
    });

    it('merges platform identifier with caller-provided metadata', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
        metadata: { basketId: 'basket_456' },
      });

      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            basketId: 'basket_456',
            platform: PLATFORM_IDENTIFIER,
          },
        }),
      );
    });

    it('creates payment intent with all optional params', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
        returnUrl: 'https://example.com/return',
        metadata: { key: 'value' },
        order: { type: 'physical_goods' },
        customerId: 'cus_123',
        customer: { first_name: 'John' },
        descriptor: 'Test Shop',
        paymentMethodOptions: { card: { three_ds_action: 'force_3ds' } },
      });

      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://example.com/return',
          metadata: { key: 'value', platform: PLATFORM_IDENTIFIER },
          order: { type: 'physical_goods' },
          customer_id: 'cus_123',
          customer: { first_name: 'John' },
          descriptor: 'Test Shop',
          payment_method_options: { card: { three_ds_action: 'force_3ds' } },
        }),
      );
    });

    it('includes referrer_data with card app name', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_data: {
            type: 'salesforce_credit_card',
            version: VERSION,
          },
        }),
      );
    });

    it('includes referrer_data with apm app name', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: true,
        data: createMockResponse(),
        statusCode: 201,
      });

      PaymentIntent.create({
        appName: APP_NAME.APM,
        amount: 100,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(mockPaymentIntentClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_data: {
            type: 'salesforce_apm',
            version: VERSION,
          },
        }),
      );
    });

    it('returns null when API call fails', () => {
      mockPaymentIntentClient.create.mockReturnValue({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Invalid amount' },
        statusCode: 400,
      });

      const result = PaymentIntent.create({
        appName: APP_NAME.CARD,
        amount: -100,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create PaymentIntent', expect.any(Object));
    });
  });

  describe('static getById', () => {
    it('retrieves payment intent by ID', () => {
      mockPaymentIntentClient.get.mockReturnValue({
        success: true,
        data: createMockResponse({ id: 'int_abc123' }),
        statusCode: 200,
      });

      const result = PaymentIntent.getById('int_abc123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('int_abc123');
      expect(mockPaymentIntentClient.get).toHaveBeenCalledWith('int_abc123');
    });

    it('returns null when not found', () => {
      mockPaymentIntentClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' },
        statusCode: 404,
      });

      const result = PaymentIntent.getById('int_nonexistent');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get PaymentIntent', expect.any(Object));
    });
  });

  describe('static fromResponse', () => {
    it('creates PaymentIntent instance from response', () => {
      const response = createMockResponse({ id: 'int_fromresponse' });

      const result = PaymentIntent.fromResponse(response);

      expect(result).toBeInstanceOf(PaymentIntent);
      expect(result.id).toBe('int_fromresponse');
    });
  });
});
