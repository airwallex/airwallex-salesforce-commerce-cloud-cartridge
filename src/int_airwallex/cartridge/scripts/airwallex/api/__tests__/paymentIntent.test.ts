jest.mock('../baseClient', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../apiHelper', () => ({
  authenticatedRequest: jest.fn(fn => fn({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' })),
  generateRequestId: jest.fn().mockReturnValue('test-uuid-1234-5678-9abc'),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import paymentIntentClient from '../paymentIntent';
import baseClient from '../baseClient';
import { authenticatedRequest, generateRequestId } from '../apiHelper';
import logger from '../../../helpers/logger';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const mockBaseClient = baseClient as jest.Mocked<typeof baseClient>;
const mockAuthenticatedRequest = authenticatedRequest as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('PaymentIntent Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default implementation that executes the callback with mock headers
    mockAuthenticatedRequest.mockImplementation(fn =>
      fn({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    );
  });

  describe('create', () => {
    const validRequest = {
      request_id: 'req_123',
      amount: 100.5,
      currency: 'USD',
      merchant_order_id: 'order_123',
    };

    const successResponse = {
      id: 'int_abc123',
      request_id: 'req_123',
      amount: 100.5,
      currency: 'USD',
      status: 'REQUIRES_PAYMENT_METHOD',
      client_secret: 'cs_secret_xyz',
      merchant_order_id: 'order_123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('creates payment intent successfully with required fields', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        validRequest,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('creates payment intent with order details', () => {
      const requestWithOrder = {
        ...validRequest,
        order: {
          type: 'physical_goods',
          products: [
            {
              name: 'Test Product',
              quantity: 2,
              unit_price: 50.25,
              sku: 'SKU123',
            },
          ],
          shipping: {
            first_name: 'John',
            last_name: 'Doe',
            address: {
              country_code: 'US',
              state: 'CA',
              city: 'San Francisco',
              street: '123 Main St',
              postcode: '94102',
            },
          },
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { ...successResponse, order: requestWithOrder.order },
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithOrder);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithOrder,
        expect.any(Object),
      );
    });

    it('creates payment intent with customer details', () => {
      const requestWithCustomer = {
        ...validRequest,
        customer: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone_number: '+1234567890',
          address: {
            country_code: 'US',
            city: 'New York',
          },
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithCustomer);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithCustomer,
        expect.any(Object),
      );
    });

    it('creates payment intent with customer_id', () => {
      const requestWithCustomerId = {
        ...validRequest,
        customer_id: 'cus_abc123',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { ...successResponse, customer_id: 'cus_abc123' },
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithCustomerId);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithCustomerId,
        expect.any(Object),
      );
    });

    it('creates payment intent with payment method options', () => {
      const requestWithOptions = {
        ...validRequest,
        payment_method_options: {
          card: {
            three_ds_action: 'force_3ds',
            auto_capture: true,
          },
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithOptions);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithOptions,
        expect.any(Object),
      );
    });

    it('creates payment intent with risk control options', () => {
      const requestWithRisk = {
        ...validRequest,
        risk_control_options: {
          skip_risk_processing: true,
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithRisk);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithRisk,
        expect.any(Object),
      );
    });

    it('creates payment intent with metadata', () => {
      const requestWithMetadata = {
        ...validRequest,
        metadata: {
          order_source: 'web',
          campaign_id: 'summer_sale',
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { ...successResponse, metadata: requestWithMetadata.metadata },
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithMetadata);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithMetadata,
        expect.any(Object),
      );
    });

    it('creates payment intent with descriptor and return_url', () => {
      const requestWithDescriptor = {
        ...validRequest,
        descriptor: 'MYSHOP - Order 123',
        return_url: 'https://example.com/checkout/complete',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithDescriptor);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithDescriptor,
        expect.any(Object),
      );
    });

    it('creates payment intent with funds split data', () => {
      const requestWithSplit = {
        ...validRequest,
        funds_split_data: [
          {
            destination: 'acct_xyz',
            amount: 20,
          },
        ],
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = paymentIntentClient.create(requestWithSplit);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_INTENTS_CREATE,
        requestWithSplit,
        expect.any(Object),
      );
    });

    it('handles API error response', () => {
      mockBaseClient.post.mockReturnValue({
        success: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'amount must be greater than 0',
        },
        statusCode: 400,
      });

      const result = paymentIntentClient.create({
        ...validRequest,
        amount: -10,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ARGUMENT');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('get', () => {
    const paymentIntentId = 'int_abc123';
    const successResponse = {
      id: paymentIntentId,
      amount: 100,
      currency: 'USD',
      status: 'SUCCEEDED',
      client_secret: 'cs_xyz',
      merchant_order_id: 'order_123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('retrieves payment intent by id', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = paymentIntentClient.get(paymentIntentId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.get).toHaveBeenCalledWith(
        `/api/v1/pa/payment_intents/${paymentIntentId}`,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('logs get request', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      paymentIntentClient.get(paymentIntentId);

      expect(mockLogger.info).toHaveBeenCalledWith('Getting PaymentIntent', {
        paymentIntentId,
      });
    });

    it('handles not found error', () => {
      mockBaseClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment intent not found' },
        statusCode: 404,
      });

      const result = paymentIntentClient.get('int_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('confirm', () => {
    const paymentIntentId = 'int_abc123';
    const confirmRequest = {
      request_id: 'req_confirm_123',
    };

    it('confirms payment intent', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { id: paymentIntentId, status: 'REQUIRES_CAPTURE' },
        statusCode: 200,
      });

      const result = paymentIntentClient.confirm(paymentIntentId, confirmRequest);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        `/api/v1/pa/payment_intents/${paymentIntentId}/confirm`,
        confirmRequest,
        expect.any(Object),
      );
    });
  });

  describe('capture', () => {
    const paymentIntentId = 'int_abc123';

    it('captures full amount', () => {
      const captureRequest = {
        request_id: 'req_capture_123',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { id: paymentIntentId, status: 'SUCCEEDED', captured_amount: 100 },
        statusCode: 200,
      });

      const result = paymentIntentClient.capture(paymentIntentId, captureRequest);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        `/api/v1/pa/payment_intents/${paymentIntentId}/capture`,
        captureRequest,
        expect.any(Object),
      );
    });

    it('captures partial amount', () => {
      const captureRequest = {
        request_id: 'req_capture_123',
        amount: 50,
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { id: paymentIntentId, status: 'SUCCEEDED', captured_amount: 50 },
        statusCode: 200,
      });

      const result = paymentIntentClient.capture(paymentIntentId, captureRequest);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        `/api/v1/pa/payment_intents/${paymentIntentId}/capture`,
        captureRequest,
        expect.any(Object),
      );
    });
  });

  describe('cancel', () => {
    const paymentIntentId = 'int_abc123';

    it('cancels payment intent', () => {
      const cancelRequest = {
        request_id: 'req_cancel_123',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { id: paymentIntentId, status: 'CANCELLED' },
        statusCode: 200,
      });

      const result = paymentIntentClient.cancel(paymentIntentId, cancelRequest);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        `/api/v1/pa/payment_intents/${paymentIntentId}/cancel`,
        cancelRequest,
        expect.any(Object),
      );
    });

    it('cancels with reason', () => {
      const cancelRequest = {
        request_id: 'req_cancel_123',
        cancellation_reason: 'Customer requested cancellation',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          id: paymentIntentId,
          status: 'CANCELLED',
          cancellation_reason: 'Customer requested cancellation',
        },
        statusCode: 200,
      });

      const result = paymentIntentClient.cancel(paymentIntentId, cancelRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('generateRequestId', () => {
    it('re-exports generateRequestId from apiHelper', () => {
      const requestId = paymentIntentClient.generateRequestId();

      expect(requestId).toBe('test-uuid-1234-5678-9abc');
      expect(generateRequestId).toHaveBeenCalled();
    });
  });
});
