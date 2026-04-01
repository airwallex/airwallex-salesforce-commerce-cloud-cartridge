/**
 * Unit tests for processWebhookQueue job
 */

jest.mock('../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../helpers/webhookQueueHelper', () => ({
  QUEUE_STATUS: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
  dequeueWebhookEvents: jest.fn(),
  markEventProcessing: jest.fn(),
  markEventCompleted: jest.fn(),
  markEventFailed: jest.fn(),
  incrementRetryCount: jest.fn(),
  cleanupCompletedEvents: jest.fn(),
  getEventCountByStatus: jest.fn(),
}));

jest.mock('../../services/webhookProcessor', () => ({
  processEvent: jest.fn(),
}));

jest.mock('../../airwallex/models/WebhookEvent', () => ({
  parse: jest.fn(),
}));

const Status = require('dw/system/Status');

const { execute } = require('../processWebhookQueue');
const webhookQueueHelper = require('../../helpers/webhookQueueHelper');
const { processEvent } = require('../../services/webhookProcessor');
const WebhookEvent = require('../../airwallex/models/WebhookEvent');
const logger = require('../../helpers/logger');

describe('processWebhookQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock returns
    webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([]);
    webhookQueueHelper.getEventCountByStatus.mockReturnValue(0);
    webhookQueueHelper.cleanupCompletedEvents.mockReturnValue(0);
    webhookQueueHelper.incrementRetryCount.mockReturnValue(1);
  });

  describe('execute', () => {
    it('returns OK status when no events to process', () => {
      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([]);

      const result = execute({});

      expect(result).toBeInstanceOf(Status);
      expect(result.code).toBe(Status.OK);
    });

    it('logs when no events to process', () => {
      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([]);

      execute({});

      expect(logger.info).toHaveBeenCalledWith('No pending webhook events to process');
    });

    it('uses default batch size of 100', () => {
      execute({});

      expect(webhookQueueHelper.dequeueWebhookEvents).toHaveBeenCalledWith(100);
    });

    it('uses custom batch size when provided', () => {
      execute({ batchSize: 50 });

      expect(webhookQueueHelper.dequeueWebhookEvents).toHaveBeenCalledWith(50);
    });

    it('processes events and marks them completed on success', () => {
      const queueItem = {
        eventId: 'evt_123',
        eventName: 'payment_intent.succeeded',
        payload: '{"id":"evt_123"}',
        status: 'PENDING',
        retryCount: 0,
      };
      const mockEvent = { id: 'evt_123', name: 'payment_intent.succeeded' };

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([queueItem]);
      WebhookEvent.parse.mockReturnValue(mockEvent);
      processEvent.mockReturnValue({ success: true });

      const result = execute({});

      expect(webhookQueueHelper.markEventProcessing).toHaveBeenCalledWith('evt_123');
      expect(processEvent).toHaveBeenCalledWith(mockEvent);
      expect(webhookQueueHelper.markEventCompleted).toHaveBeenCalledWith('evt_123');
      expect(result.code).toBe(Status.OK);
    });

    it('increments retry count on processing failure', () => {
      const queueItem = {
        eventId: 'evt_456',
        eventName: 'payment_intent.succeeded',
        payload: '{}',
        status: 'PENDING',
        retryCount: 0,
      };
      const mockEvent = { id: 'evt_456' };

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([queueItem]);
      WebhookEvent.parse.mockReturnValue(mockEvent);
      processEvent.mockReturnValue({ success: false, error: 'Order not found' });
      webhookQueueHelper.incrementRetryCount.mockReturnValue(1);

      execute({});

      expect(webhookQueueHelper.incrementRetryCount).toHaveBeenCalledWith('evt_456');
    });

    it('marks event as failed after max retries', () => {
      const queueItem = {
        eventId: 'evt_789',
        eventName: 'payment_intent.succeeded',
        payload: '{}',
        status: 'PENDING',
        retryCount: 2,
      };
      const mockEvent = { id: 'evt_789' };

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([queueItem]);
      WebhookEvent.parse.mockReturnValue(mockEvent);
      processEvent.mockReturnValue({ success: false, error: 'Persistent error' });
      webhookQueueHelper.incrementRetryCount.mockReturnValue(3); // MAX_RETRIES = 3

      execute({});

      expect(webhookQueueHelper.markEventFailed).toHaveBeenCalledWith('evt_789', 'Persistent error');
    });

    it('marks event as failed if payload cannot be parsed', () => {
      const queueItem = {
        eventId: 'evt_invalid',
        eventName: 'payment_intent.succeeded',
        payload: 'invalid json',
        status: 'PENDING',
        retryCount: 0,
      };

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([queueItem]);
      WebhookEvent.parse.mockReturnValue(null);

      execute({});

      expect(webhookQueueHelper.markEventFailed).toHaveBeenCalledWith('evt_invalid', 'Failed to parse event payload');
    });

    it('cleans up old completed events', () => {
      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([]);
      webhookQueueHelper.cleanupCompletedEvents.mockReturnValue(5);

      execute({});

      expect(webhookQueueHelper.cleanupCompletedEvents).toHaveBeenCalledWith(30);
    });

    it('logs queue stats before and after processing', () => {
      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([]);
      webhookQueueHelper.getEventCountByStatus
        .mockReturnValueOnce(10) // pending before
        .mockReturnValueOnce(2) // failed before
        .mockReturnValueOnce(8) // pending after
        .mockReturnValueOnce(3); // failed after

      execute({});

      expect(webhookQueueHelper.getEventCountByStatus).toHaveBeenCalledWith('PENDING');
      expect(webhookQueueHelper.getEventCountByStatus).toHaveBeenCalledWith('FAILED');
    });

    it('handles exceptions during processing', () => {
      const queueItem = {
        eventId: 'evt_exception',
        eventName: 'payment_intent.succeeded',
        payload: '{}',
        status: 'PENDING',
        retryCount: 0,
      };
      const mockEvent = { id: 'evt_exception' };

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue([queueItem]);
      WebhookEvent.parse.mockReturnValue(mockEvent);
      processEvent.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      webhookQueueHelper.incrementRetryCount.mockReturnValue(1);

      // Should not throw
      const result = execute({});

      expect(result.code).toBe(Status.OK);
      expect(webhookQueueHelper.incrementRetryCount).toHaveBeenCalledWith('evt_exception');
    });

    it('processes multiple events and counts successes and failures', () => {
      const queueItems = [
        { eventId: 'evt_1', eventName: 'event1', payload: '{}', status: 'PENDING', retryCount: 0 },
        { eventId: 'evt_2', eventName: 'event2', payload: '{}', status: 'PENDING', retryCount: 0 },
        { eventId: 'evt_3', eventName: 'event3', payload: '{}', status: 'PENDING', retryCount: 0 },
      ];

      webhookQueueHelper.dequeueWebhookEvents.mockReturnValue(queueItems);
      WebhookEvent.parse.mockReturnValue({ id: 'test' });
      processEvent
        .mockReturnValueOnce({ success: true })
        .mockReturnValueOnce({ success: false, error: 'Failed' })
        .mockReturnValueOnce({ success: true });

      execute({});

      expect(webhookQueueHelper.markEventCompleted).toHaveBeenCalledTimes(2);
      expect(webhookQueueHelper.incrementRetryCount).toHaveBeenCalledTimes(1);
    });
  });
});

export {};
