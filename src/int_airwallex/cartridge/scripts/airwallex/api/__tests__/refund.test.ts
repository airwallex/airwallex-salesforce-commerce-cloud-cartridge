jest.mock('../baseClient', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../apiHelper', () => ({
  authenticatedRequest: jest.fn(requestFn => {
    const headers = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };
    return requestFn(headers);
  }),
  generateRequestId: jest.fn().mockReturnValue('test-uuid-1234-5678-9abc'),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import refundClient from '../refund';
import baseClient from '../baseClient';
import { authenticatedRequest } from '../apiHelper';
import logger from '../../../helpers/logger';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const mockBaseClient = baseClient as jest.Mocked<typeof baseClient>;
const mockAuthenticatedRequest = authenticatedRequest as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Refund Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedRequest.mockImplementation(requestFn => {
      const headers = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };
      return requestFn(headers);
    });
  });

  describe('create', () => {
    const validRequest = {
      request_id: 'req_123',
      payment_intent_id: 'int_abc123',
      amount: 50.0,
    };

    const successResponse = {
      id: 'ref_xyz789',
      request_id: 'req_123',
      payment_intent_id: 'int_abc123',
      amount: 50.0,
      currency: 'USD',
      status: 'RECEIVED',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('creates refund successfully with required fields', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = refundClient.create(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.REFUNDS_CREATE,
        validRequest,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('creates refund with reason', () => {
      const requestWithReason = {
        ...validRequest,
        reason: 'Customer request',
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: { ...successResponse, reason: 'Customer request' },
        statusCode: 201,
      });

      const result = refundClient.create(requestWithReason);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.REFUNDS_CREATE,
        requestWithReason,
        expect.any(Object),
      );
    });

    it('creates refund with metadata', () => {
      const requestWithMetadata = {
        ...validRequest,
        metadata: {
          refund_reason: 'damaged_goods',
          ticket_id: 'TICKET-123',
        },
      };

      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      const result = refundClient.create(requestWithMetadata);

      expect(result.success).toBe(true);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.REFUNDS_CREATE,
        requestWithMetadata,
        expect.any(Object),
      );
    });

    it('logs create request', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 201,
      });

      refundClient.create(validRequest);

      expect(mockLogger.info).toHaveBeenCalledWith('Creating Refund', {
        paymentIntentId: validRequest.payment_intent_id,
        amount: validRequest.amount,
      });
    });

    it('handles API error response', () => {
      mockBaseClient.post.mockReturnValue({
        success: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'amount exceeds refundable amount',
        },
        statusCode: 400,
      });

      const result = refundClient.create(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ARGUMENT');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('get', () => {
    const refundId = 'ref_xyz789';
    const successResponse = {
      id: refundId,
      request_id: 'req_123',
      payment_intent_id: 'int_abc123',
      amount: 50.0,
      currency: 'USD',
      status: 'SUCCEEDED',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('retrieves refund by id', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = refundClient.get(refundId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.get).toHaveBeenCalledWith(
        `/api/v1/pa/refunds/${refundId}`,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('logs get request', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      refundClient.get(refundId);

      expect(mockLogger.info).toHaveBeenCalledWith('Getting Refund', {
        refundId,
      });
    });

    it('handles not found error', () => {
      mockBaseClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund not found' },
        statusCode: 404,
      });

      const result = refundClient.get('ref_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('generateRequestId', () => {
    it('returns UUID from apiHelper', () => {
      const requestId = refundClient.generateRequestId();

      expect(requestId).toBe('test-uuid-1234-5678-9abc');
    });
  });
});
