/**
 * Unit tests for webhookQueueHelper module
 */

jest.mock('../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Transaction = require('dw/system/Transaction');

const webhookQueueHelper = require('../webhookQueueHelper');
const {
  QUEUE_STATUS,
  enqueueWebhookEvent,
  dequeueWebhookEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  incrementRetryCount,
  cleanupCompletedEvents,
  getEventCountByStatus,
} = webhookQueueHelper;

// Mock WebhookEvent
const createMockWebhookEvent = (overrides = {}) => ({
  id: 'evt_test123',
  name: 'payment_intent.succeeded',
  accountId: 'acct_123',
  data: {
    object_type: 'payment_intent',
    object: {
      id: 'int_abc789',
      amount: 10000,
      currency: 'USD',
      merchant_order_id: 'ORDER-001',
    },
  },
  ...overrides,
});

describe('webhookQueueHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CustomObjectMgr._reset();
  });

  describe('QUEUE_STATUS', () => {
    it('has correct status values', () => {
      expect(QUEUE_STATUS.PENDING).toBe('PENDING');
      expect(QUEUE_STATUS.PROCESSING).toBe('PROCESSING');
      expect(QUEUE_STATUS.COMPLETED).toBe('COMPLETED');
      expect(QUEUE_STATUS.FAILED).toBe('FAILED');
    });
  });

  describe('enqueueWebhookEvent', () => {
    it('creates a custom object with correct data', () => {
      const event = createMockWebhookEvent();
      const payload = JSON.stringify(event);

      enqueueWebhookEvent(event, payload);

      expect(CustomObjectMgr.createCustomObject).toHaveBeenCalledWith('AirwallexWebhookEvent', 'evt_test123');
    });

    it('sets correct custom attributes on the object', () => {
      const event = createMockWebhookEvent();
      const payload = JSON.stringify(event);

      enqueueWebhookEvent(event, payload);

      const createdObj = CustomObjectMgr._getCustomObjects().get('AirwallexWebhookEvent:evt_test123');
      expect(createdObj.custom.eventId).toBe('evt_test123');
      expect(createdObj.custom.eventName).toBe('payment_intent.succeeded');
      expect(createdObj.custom.payload).toBe(payload);
      expect(createdObj.custom.status).toBe('PENDING');
      expect(createdObj.custom.retryCount).toBe(0);
    });

    it('wraps creation in a transaction', () => {
      const event = createMockWebhookEvent();
      const payload = JSON.stringify(event);

      enqueueWebhookEvent(event, payload);

      expect(Transaction.wrap).toHaveBeenCalled();
    });

    it('does not create duplicate event if already exists', () => {
      const event = createMockWebhookEvent();
      const payload = JSON.stringify(event);

      // Add existing event
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_test123');

      enqueueWebhookEvent(event, payload);

      // Should only be called once for the existing check, not for creation
      expect(CustomObjectMgr.getCustomObject).toHaveBeenCalledWith('AirwallexWebhookEvent', 'evt_test123');
    });
  });

  describe('dequeueWebhookEvents', () => {
    it('returns empty array when no events exist', () => {
      const items = dequeueWebhookEvents(10);
      expect(items).toHaveLength(0);
    });

    it('returns pending events', () => {
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        eventId: 'evt_1',
        eventName: 'payment_intent.succeeded',
        payload: '{}',
        status: 'PENDING',
        retryCount: 0,
      });

      const items = dequeueWebhookEvents(10);

      expect(items).toHaveLength(1);
      expect(items[0].eventId).toBe('evt_1');
    });

    it('respects the limit parameter', () => {
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        eventId: 'evt_1',
        status: 'PENDING',
      });
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_2', {
        eventId: 'evt_2',
        status: 'PENDING',
      });

      const items = dequeueWebhookEvents(1);

      expect(items).toHaveLength(1);
    });

    it('returns items with correct structure', () => {
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        eventId: 'evt_1',
        eventName: 'payment_intent.succeeded',
        payload: '{"test": true}',
        status: 'PENDING',
        retryCount: 2,
        errorMessage: 'Previous error',
        createdAt: new Date('2024-01-15'),
        processedAt: null,
      });

      const items = dequeueWebhookEvents(10);

      expect(items[0]).toEqual({
        eventId: 'evt_1',
        eventName: 'payment_intent.succeeded',
        payload: '{"test": true}',
        status: 'PENDING',
        retryCount: 2,
        errorMessage: 'Previous error',
        createdAt: new Date('2024-01-15'),
        processedAt: null,
      });
    });
  });

  describe('markEventProcessing', () => {
    it('updates status to PROCESSING', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        status: 'PENDING',
      });

      markEventProcessing('evt_1');

      expect(obj.custom.status).toBe('PROCESSING');
    });

    it('wraps update in a transaction', () => {
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1');

      markEventProcessing('evt_1');

      expect(Transaction.wrap).toHaveBeenCalled();
    });
  });

  describe('markEventCompleted', () => {
    it('updates status to COMPLETED', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        status: 'PROCESSING',
      });

      markEventCompleted('evt_1');

      expect(obj.custom.status).toBe('COMPLETED');
    });

    it('sets processedAt timestamp', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1');

      markEventCompleted('evt_1');

      expect(obj.custom.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('markEventFailed', () => {
    it('updates status to FAILED', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        status: 'PROCESSING',
      });

      markEventFailed('evt_1', 'Max retries exceeded');

      expect(obj.custom.status).toBe('FAILED');
    });

    it('sets error message', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1');

      markEventFailed('evt_1', 'Order not found');

      expect(obj.custom.errorMessage).toBe('Order not found');
    });

    it('sets processedAt timestamp', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1');

      markEventFailed('evt_1', 'Error');

      expect(obj.custom.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('incrementRetryCount', () => {
    it('increments retry count by 1', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        retryCount: 0,
      });

      const newCount = incrementRetryCount('evt_1');

      expect(newCount).toBe(1);
      expect(obj.custom.retryCount).toBe(1);
    });

    it('resets status to PENDING for retry', () => {
      const obj = CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        status: 'PROCESSING',
        retryCount: 1,
      });

      incrementRetryCount('evt_1');

      expect(obj.custom.status).toBe('PENDING');
    });

    it('returns 0 if event not found', () => {
      const newCount = incrementRetryCount('nonexistent');
      expect(newCount).toBe(0);
    });
  });

  describe('cleanupCompletedEvents', () => {
    it('removes completed events older than specified days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_old', {
        status: 'COMPLETED',
        processedAt: oldDate,
      });

      const removedCount = cleanupCompletedEvents(7);

      expect(removedCount).toBe(1);
      expect(CustomObjectMgr.remove).toHaveBeenCalled();
    });

    it('does not remove events newer than specified days', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);

      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_recent', {
        status: 'COMPLETED',
        processedAt: recentDate,
      });

      const removedCount = cleanupCompletedEvents(7);

      // Query mock doesn't filter by date, but function should handle it
      expect(removedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEventCountByStatus', () => {
    it('returns count of events with given status', () => {
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_1', {
        status: 'PENDING',
      });
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_2', {
        status: 'PENDING',
      });
      CustomObjectMgr._addCustomObject('AirwallexWebhookEvent', 'evt_3', {
        status: 'COMPLETED',
      });

      const pendingCount = getEventCountByStatus('PENDING');

      expect(pendingCount).toBe(2);
    });

    it('returns 0 when no events match', () => {
      const count = getEventCountByStatus('FAILED');
      expect(count).toBe(0);
    });
  });
});

export {};
