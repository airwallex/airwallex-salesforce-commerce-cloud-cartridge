jest.mock('../../api/refund', () => ({
  create: jest.fn(),
  get: jest.fn(),
  generateRequestId: jest.fn().mockReturnValue('test-request-id'),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import Refund from '../Refund';
import refundClient from '../../api/refund';
import logger from '../../../helpers/logger';
import { REFUND_STATUS } from '../../../constants/paymentStatus';
import type { RefundResponse } from '../../api/types';

const mockRefundClient = refundClient as jest.Mocked<typeof refundClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Refund Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRefundResponse = (overrides: Partial<RefundResponse> = {}): RefundResponse => ({
    id: 'ref_test123',
    request_id: 'req_123',
    payment_intent_id: 'int_abc123',
    amount: 50.0,
    currency: 'USD',
    status: REFUND_STATUS.SUCCEEDED,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('constructor', () => {
    it('initializes all properties from response data', () => {
      const data = createMockRefundResponse({
        reason: 'Customer request',
      });

      const refund = new Refund(data);

      expect(refund.id).toBe('ref_test123');
      expect(refund.paymentIntentId).toBe('int_abc123');
      expect(refund.amount).toBe(50.0);
      expect(refund.currency).toBe('USD');
      expect(refund.status).toBe(REFUND_STATUS.SUCCEEDED);
      expect(refund.reason).toBe('Customer request');
      expect(refund.createdAt).toBeInstanceOf(Date);
      expect(refund.updatedAt).toBeInstanceOf(Date);
    });

    it('handles missing optional fields', () => {
      const data = createMockRefundResponse();

      const refund = new Refund(data);

      expect(refund.reason).toBeUndefined();
    });

    it('parses date strings correctly', () => {
      const data = createMockRefundResponse({
        created_at: '2024-06-15T10:30:00Z',
        updated_at: '2024-06-15T11:00:00Z',
      });

      const refund = new Refund(data);

      expect(refund.createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(refund.updatedAt.toISOString()).toBe('2024-06-15T11:00:00.000Z');
    });
  });

  describe('status checks', () => {
    describe('isReceived', () => {
      it('returns true when status is RECEIVED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
        expect(refund.isReceived).toBe(true);
      });

      it('returns false when status is not RECEIVED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isReceived).toBe(false);
      });
    });

    describe('isAccepted', () => {
      it('returns true when status is ACCEPTED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.ACCEPTED }));
        expect(refund.isAccepted).toBe(true);
      });

      it('returns false when status is not ACCEPTED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isAccepted).toBe(false);
      });
    });

    describe('isSucceeded', () => {
      it('returns true when status is SUCCEEDED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isSucceeded).toBe(true);
      });

      it('returns false when status is not SUCCEEDED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
        expect(refund.isSucceeded).toBe(false);
      });
    });

    describe('isFailed', () => {
      it('returns true when status is FAILED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.FAILED }));
        expect(refund.isFailed).toBe(true);
      });

      it('returns false when status is not FAILED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isFailed).toBe(false);
      });
    });

    describe('isCompleted', () => {
      it('returns true when status is ACCEPTED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.ACCEPTED }));
        expect(refund.isCompleted).toBe(true);
      });

      it('returns true when status is SUCCEEDED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isCompleted).toBe(true);
      });

      it('returns false when status is RECEIVED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
        expect(refund.isCompleted).toBe(false);
      });

      it('returns false when status is FAILED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.FAILED }));
        expect(refund.isCompleted).toBe(false);
      });
    });

    describe('isInProgress', () => {
      it('returns true when status is RECEIVED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
        expect(refund.isInProgress).toBe(true);
      });

      it('returns false when status is ACCEPTED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.ACCEPTED }));
        expect(refund.isInProgress).toBe(false);
      });

      it('returns false when status is SUCCEEDED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
        expect(refund.isInProgress).toBe(false);
      });

      it('returns false when status is FAILED', () => {
        const refund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.FAILED }));
        expect(refund.isInProgress).toBe(false);
      });
    });
  });

  describe('refresh', () => {
    it('returns refreshed Refund on success', () => {
      const originalData = createMockRefundResponse({ status: REFUND_STATUS.RECEIVED });
      const refund = new Refund(originalData);

      const updatedData = createMockRefundResponse({
        status: REFUND_STATUS.SUCCEEDED,
        updated_at: '2024-01-01T01:00:00Z',
      });
      mockRefundClient.get.mockReturnValue({
        success: true,
        data: updatedData,
        statusCode: 200,
      });

      const refreshed = refund.refresh();

      expect(refreshed).not.toBeNull();
      expect(refreshed?.status).toBe(REFUND_STATUS.SUCCEEDED);
      expect(mockRefundClient.get).toHaveBeenCalledWith('ref_test123');
    });

    it('returns null and logs error on failure', () => {
      const refund = new Refund(createMockRefundResponse());

      mockRefundClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund not found' },
        statusCode: 404,
      });

      const refreshed = refund.refresh();

      expect(refreshed).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to refresh Refund', {
        id: 'ref_test123',
        error: { code: 'NOT_FOUND', message: 'Refund not found' },
      });
    });
  });

  describe('static create', () => {
    it('creates refund with required params', () => {
      const responseData = createMockRefundResponse({ status: REFUND_STATUS.RECEIVED });
      mockRefundClient.create.mockReturnValue({
        success: true,
        data: responseData,
        statusCode: 201,
      });

      const refund = Refund.create({
        paymentIntentId: 'int_abc123',
        amount: 50.0,
      });

      expect(refund).not.toBeNull();
      expect(refund?.id).toBe('ref_test123');
      expect(refund?.amount).toBe(50.0);
      expect(mockRefundClient.create).toHaveBeenCalledWith({
        payment_intent_id: 'int_abc123',
        amount: 50.0,
        reason: undefined,
        request_id: 'test-request-id',
        metadata: undefined,
      });
    });

    it('creates refund with all optional params', () => {
      const responseData = createMockRefundResponse({
        status: REFUND_STATUS.RECEIVED,
        reason: 'Customer request',
      });
      mockRefundClient.create.mockReturnValue({
        success: true,
        data: responseData,
        statusCode: 201,
      });

      const refund = Refund.create({
        paymentIntentId: 'int_abc123',
        amount: 50.0,
        reason: 'Customer request',
        metadata: { ticket_id: 'TICKET-123' },
      });

      expect(refund).not.toBeNull();
      expect(mockRefundClient.create).toHaveBeenCalledWith({
        payment_intent_id: 'int_abc123',
        amount: 50.0,
        reason: 'Customer request',
        request_id: 'test-request-id',
        metadata: { ticket_id: 'TICKET-123' },
      });
    });

    it('logs success on creation', () => {
      const responseData = createMockRefundResponse();
      mockRefundClient.create.mockReturnValue({
        success: true,
        data: responseData,
        statusCode: 201,
      });

      Refund.create({
        paymentIntentId: 'int_abc123',
        amount: 50.0,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Refund created', {
        id: 'ref_test123',
        paymentIntentId: 'int_abc123',
        amount: 50.0,
      });
    });

    it('returns null when API call fails', () => {
      mockRefundClient.create.mockReturnValue({
        success: false,
        error: { code: 'INVALID_ARGUMENT', message: 'Amount exceeds refundable amount' },
        statusCode: 400,
      });

      const refund = Refund.create({
        paymentIntentId: 'int_abc123',
        amount: 1000.0,
      });

      expect(refund).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create Refund', {
        paymentIntentId: 'int_abc123',
        error: { code: 'INVALID_ARGUMENT', message: 'Amount exceeds refundable amount' },
      });
    });

    it('uses generateRequestId for request_id', () => {
      mockRefundClient.create.mockReturnValue({
        success: true,
        data: createMockRefundResponse(),
        statusCode: 201,
      });

      Refund.create({
        paymentIntentId: 'int_abc123',
        amount: 50.0,
      });

      expect(mockRefundClient.generateRequestId).toHaveBeenCalled();
      expect(mockRefundClient.create).toHaveBeenCalledWith(expect.objectContaining({ request_id: 'test-request-id' }));
    });
  });

  describe('static getById', () => {
    it('returns Refund on success', () => {
      const responseData = createMockRefundResponse();
      mockRefundClient.get.mockReturnValue({
        success: true,
        data: responseData,
        statusCode: 200,
      });

      const refund = Refund.getById('ref_test123');

      expect(refund).not.toBeNull();
      expect(refund?.id).toBe('ref_test123');
      expect(mockRefundClient.get).toHaveBeenCalledWith('ref_test123');
    });

    it('returns null and logs error on failure', () => {
      mockRefundClient.get.mockReturnValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund not found' },
        statusCode: 404,
      });

      const refund = Refund.getById('ref_nonexistent');

      expect(refund).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get Refund', {
        id: 'ref_nonexistent',
        error: { code: 'NOT_FOUND', message: 'Refund not found' },
      });
    });
  });

  describe('static fromResponse', () => {
    it('creates Refund instance from response data', () => {
      const responseData = createMockRefundResponse({
        reason: 'Duplicate charge',
      });

      const refund = Refund.fromResponse(responseData);

      expect(refund).toBeInstanceOf(Refund);
      expect(refund.id).toBe('ref_test123');
      expect(refund.reason).toBe('Duplicate charge');
    });
  });

  describe('status transitions', () => {
    it('RECEIVED -> ACCEPTED -> SUCCEEDED lifecycle', () => {
      const receivedRefund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
      expect(receivedRefund.isReceived).toBe(true);
      expect(receivedRefund.isInProgress).toBe(true);
      expect(receivedRefund.isCompleted).toBe(false);

      const acceptedRefund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.ACCEPTED }));
      expect(acceptedRefund.isAccepted).toBe(true);
      expect(acceptedRefund.isInProgress).toBe(false);
      expect(acceptedRefund.isCompleted).toBe(true);

      const succeededRefund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.SUCCEEDED }));
      expect(succeededRefund.isSucceeded).toBe(true);
      expect(succeededRefund.isInProgress).toBe(false);
      expect(succeededRefund.isCompleted).toBe(true);
    });

    it('RECEIVED -> FAILED lifecycle', () => {
      const receivedRefund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.RECEIVED }));
      expect(receivedRefund.isInProgress).toBe(true);

      const failedRefund = new Refund(createMockRefundResponse({ status: REFUND_STATUS.FAILED }));
      expect(failedRefund.isFailed).toBe(true);
      expect(failedRefund.isInProgress).toBe(false);
      expect(failedRefund.isCompleted).toBe(false);
    });
  });
});
