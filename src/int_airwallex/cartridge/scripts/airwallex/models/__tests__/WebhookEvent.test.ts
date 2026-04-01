/**
 * Unit tests for WebhookEvent model
 */

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const WebhookEvent = require('../WebhookEvent');
const { WEBHOOK_EVENTS, PROCESSABLE_EVENT_TYPES } = require('../WebhookEvent');
const logger = require('../../../helpers/logger');

const mockLogger = logger as jest.Mocked<typeof logger>;

// Helper to create a mock webhook payload
const createMockPayload = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt_test123',
  name: 'payment_intent.succeeded',
  accountId: 'acct_123',
  createdAt: '2024-01-15T10:30:00Z',
  sourceId: 'src_456',
  data: {
    object_type: 'payment_intent',
    object: {
      id: 'int_abc789',
      amount: 10000,
      currency: 'USD',
      status: 'SUCCEEDED',
      merchant_order_id: 'ORDER-001',
    },
  },
  ...overrides,
});

// Helper to create a refund webhook payload
const createRefundPayload = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt_refund123',
  name: 'refund.settled',
  accountId: 'acct_123',
  createdAt: '2024-01-15T11:00:00Z',
  data: {
    object_type: 'refund',
    object: {
      id: 'ref_xyz789',
      amount: 5000,
      currency: 'USD',
      status: 'SETTLED',
      payment_intent_id: 'int_abc789',
    },
  },
  ...overrides,
});

describe('WebhookEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WEBHOOK_EVENTS constants', () => {
    it('has correct payment intent event types', () => {
      expect(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_PAYMENT_METHOD).toBe('payment_intent.requires_payment_method');
      expect(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CUSTOMER_ACTION).toBe('payment_intent.requires_customer_action');
      expect(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE).toBe('payment_intent.requires_capture');
      expect(WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED).toBe('payment_intent.succeeded');
      expect(WEBHOOK_EVENTS.PAYMENT_INTENT_CANCELLED).toBe('payment_intent.cancelled');
    });

    it('has correct refund event types', () => {
      expect(WEBHOOK_EVENTS.REFUND_ACCEPTED).toBe('refund.accepted');
      expect(WEBHOOK_EVENTS.REFUND_FAILED).toBe('refund.failed');
    });
  });

  describe('constructor', () => {
    it('initializes all properties from payload', () => {
      const payload = createMockPayload();
      const event = new WebhookEvent(payload);

      expect(event.id).toBe('evt_test123');
      expect(event.name).toBe('payment_intent.succeeded');
      expect(event.accountId).toBe('acct_123');
      expect(event.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(event.sourceId).toBe('src_456');
      expect(event.data).toEqual(payload.data);
    });

    it('handles snake_case property names', () => {
      const payload = {
        id: 'evt_123',
        name: 'payment_intent.succeeded',
        account_id: 'acct_snake',
        created_at: '2024-01-01T00:00:00Z',
        source_id: 'src_snake',
        data: { object_type: 'payment_intent', object: {} },
      };
      const event = new WebhookEvent(payload);

      expect(event.accountId).toBe('acct_snake');
      expect(event.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(event.sourceId).toBe('src_snake');
    });

    it('handles missing optional fields', () => {
      const payload = {
        id: 'evt_123',
        name: 'payment_intent.succeeded',
        data: { object_type: 'payment_intent', object: {} },
      };
      const event = new WebhookEvent(payload);

      expect(event.id).toBe('evt_123');
      expect(event.sourceId).toBeUndefined();
    });
  });

  describe('Event Type Checks', () => {
    describe('isPaymentIntentEvent', () => {
      it('returns true for payment intent events', () => {
        const event = new WebhookEvent(createMockPayload({ name: 'payment_intent.succeeded' }));
        expect(event.isPaymentIntentEvent).toBe(true);
      });

      it('returns true for all payment intent event types', () => {
        const eventTypes = [
          'payment_intent.requires_payment_method',
          'payment_intent.requires_customer_action',
          'payment_intent.requires_capture',
          'payment_intent.succeeded',
          'payment_intent.cancelled',
        ];

        eventTypes.forEach(name => {
          const event = new WebhookEvent(createMockPayload({ name }));
          expect(event.isPaymentIntentEvent).toBe(true);
        });
      });

      it('returns false for refund events', () => {
        const event = new WebhookEvent(createRefundPayload());
        expect(event.isPaymentIntentEvent).toBe(false);
      });
    });

    describe('isRefundEvent', () => {
      it('returns true for refund events', () => {
        const event = new WebhookEvent(createRefundPayload());
        expect(event.isRefundEvent).toBe(true);
      });

      it('returns true for all refund event types', () => {
        const eventTypes = ['refund.accepted', 'refund.settled', 'refund.failed'];

        eventTypes.forEach(name => {
          const event = new WebhookEvent(createRefundPayload({ name }));
          expect(event.isRefundEvent).toBe(true);
        });
      });

      it('returns false for payment intent events', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.isRefundEvent).toBe(false);
      });
    });

    describe('isPaymentSucceeded', () => {
      it('returns true when name is payment_intent.succeeded', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED }));
        expect(event.isPaymentSucceeded).toBe(true);
      });

      it('returns false for other payment intent events', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE }));
        expect(event.isPaymentSucceeded).toBe(false);
      });
    });

    describe('isPaymentRequiresCapture', () => {
      it('returns true when name is payment_intent.requires_capture', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE }));
        expect(event.isPaymentRequiresCapture).toBe(true);
      });

      it('returns false for other events', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED }));
        expect(event.isPaymentRequiresCapture).toBe(false);
      });
    });

    describe('isPaymentCancelled', () => {
      it('returns true when name is payment_intent.cancelled', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_CANCELLED }));
        expect(event.isPaymentCancelled).toBe(true);
      });

      it('returns false for other events', () => {
        const event = new WebhookEvent(createMockPayload({ name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED }));
        expect(event.isPaymentCancelled).toBe(false);
      });
    });

    describe('isRefundSucceeded', () => {
      it('returns true for refund.accepted', () => {
        const event = new WebhookEvent(createRefundPayload({ name: WEBHOOK_EVENTS.REFUND_ACCEPTED }));
        expect(event.isRefundSucceeded).toBe(true);
      });

      it('returns true for refund.settled', () => {
        const event = new WebhookEvent(createRefundPayload({ name: WEBHOOK_EVENTS.REFUND_SETTLED }));
        expect(event.isRefundSucceeded).toBe(true);
      });

      it('returns false for refund.failed', () => {
        const event = new WebhookEvent(createRefundPayload({ name: WEBHOOK_EVENTS.REFUND_FAILED }));
        expect(event.isRefundSucceeded).toBe(false);
      });
    });

    describe('isRefundFailed', () => {
      it('returns true for refund.failed', () => {
        const event = new WebhookEvent(createRefundPayload({ name: WEBHOOK_EVENTS.REFUND_FAILED }));
        expect(event.isRefundFailed).toBe(true);
      });

      it('returns false for refund.settled', () => {
        const event = new WebhookEvent(createRefundPayload({ name: WEBHOOK_EVENTS.REFUND_SETTLED }));
        expect(event.isRefundFailed).toBe(false);
      });
    });
  });

  describe('Data Accessors', () => {
    describe('objectType', () => {
      it('returns the object type from data', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.objectType).toBe('payment_intent');
      });

      it('returns empty string when data is missing', () => {
        const event = new WebhookEvent({ id: 'evt_123', name: 'test' });
        expect(event.objectType).toBe('');
      });
    });

    describe('object', () => {
      it('returns the object from data', () => {
        const payload = createMockPayload();
        const event = new WebhookEvent(payload);
        expect(event.object).toEqual(payload.data.object);
      });

      it('returns empty object when data is missing', () => {
        const event = new WebhookEvent({ id: 'evt_123', name: 'test' });
        expect(event.object).toEqual({});
      });
    });

    describe('paymentIntentId', () => {
      it('returns id from object for payment intent events', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.paymentIntentId).toBe('int_abc789');
      });

      it('returns payment_intent_id from object for refund events', () => {
        const event = new WebhookEvent(createRefundPayload());
        expect(event.paymentIntentId).toBe('int_abc789');
      });

      it('returns null for other event types', () => {
        const event = new WebhookEvent({
          id: 'evt_123',
          name: 'other.event',
          data: { object_type: 'other', object: { id: 'other_123' } },
        });
        expect(event.paymentIntentId).toBeNull();
      });
    });

    describe('merchantOrderId', () => {
      it('returns merchant_order_id from object', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.merchantOrderId).toBe('ORDER-001');
      });

      it('returns null when not present', () => {
        const payload = createMockPayload();
        delete (payload.data.object as Record<string, unknown>).merchant_order_id;
        const event = new WebhookEvent(payload);
        expect(event.merchantOrderId).toBeNull();
      });
    });

    describe('refundId', () => {
      it('returns id from object for refund events', () => {
        const event = new WebhookEvent(createRefundPayload());
        expect(event.refundId).toBe('ref_xyz789');
      });

      it('returns null for payment intent events', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.refundId).toBeNull();
      });
    });

    describe('amount', () => {
      it('returns amount from object', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.amount).toBe(10000);
      });

      it('returns null when not present', () => {
        const payload = createMockPayload();
        delete (payload.data.object as Record<string, unknown>).amount;
        const event = new WebhookEvent(payload);
        expect(event.amount).toBeNull();
      });
    });

    describe('currency', () => {
      it('returns currency from object', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.currency).toBe('USD');
      });

      it('returns null when not present', () => {
        const payload = createMockPayload();
        delete (payload.data.object as Record<string, unknown>).currency;
        const event = new WebhookEvent(payload);
        expect(event.currency).toBeNull();
      });
    });

    describe('status', () => {
      it('returns status from object', () => {
        const event = new WebhookEvent(createMockPayload());
        expect(event.status).toBe('SUCCEEDED');
      });

      it('returns null when not present', () => {
        const payload = createMockPayload();
        delete (payload.data.object as Record<string, unknown>).status;
        const event = new WebhookEvent(payload);
        expect(event.status).toBeNull();
      });
    });
  });

  describe('PROCESSABLE_EVENT_TYPES', () => {
    it('contains payment_intent.succeeded', () => {
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED)).toBe(true);
    });

    it('contains refund.accepted', () => {
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.REFUND_ACCEPTED)).toBe(true);
    });

    it('does not contain other event types', () => {
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_PAYMENT_METHOD)).toBe(false);
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CUSTOMER_ACTION)).toBe(false);
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE)).toBe(false);
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.PAYMENT_INTENT_CANCELLED)).toBe(false);
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.REFUND_SETTLED)).toBe(false);
      expect(PROCESSABLE_EVENT_TYPES.has(WEBHOOK_EVENTS.REFUND_FAILED)).toBe(false);
    });

    it('has exactly 2 entries', () => {
      expect(PROCESSABLE_EVENT_TYPES.size).toBe(2);
    });
  });

  describe('metadata accessor', () => {
    it('returns metadata from object', () => {
      const event = new WebhookEvent(
        createMockPayload({
          data: {
            object_type: 'payment_intent',
            object: {
              id: 'int_abc789',
              metadata: { platform: 'salesforce', basketId: 'basket_123' },
            },
          },
        }),
      );
      expect(event.metadata).toEqual({ platform: 'salesforce', basketId: 'basket_123' });
    });

    it('returns null when metadata is not present', () => {
      const event = new WebhookEvent(createMockPayload());
      expect(event.metadata).toBeNull();
    });
  });

  describe('platform accessor', () => {
    it('returns platform from metadata', () => {
      const event = new WebhookEvent(
        createMockPayload({
          data: {
            object_type: 'payment_intent',
            object: {
              id: 'int_abc789',
              metadata: { platform: 'salesforce' },
            },
          },
        }),
      );
      expect(event.platform).toBe('salesforce');
    });

    it('returns null when metadata has no platform', () => {
      const event = new WebhookEvent(
        createMockPayload({
          data: {
            object_type: 'payment_intent',
            object: {
              id: 'int_abc789',
              metadata: { basketId: 'basket_123' },
            },
          },
        }),
      );
      expect(event.platform).toBeNull();
    });

    it('returns null when metadata is absent', () => {
      const event = new WebhookEvent(createMockPayload());
      expect(event.platform).toBeNull();
    });
  });

  describe('isProcessableEvent', () => {
    it('returns true for payment_intent.succeeded with salesforce platform', () => {
      const event = new WebhookEvent(
        createMockPayload({
          name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED,
          data: {
            object_type: 'payment_intent',
            object: { id: 'int_1', metadata: { platform: 'salesforce' } },
          },
        }),
      );
      expect(WebhookEvent.isProcessableEvent(event)).toBe(true);
    });

    it('returns false for payment_intent.succeeded without platform metadata', () => {
      const event = new WebhookEvent(
        createMockPayload({
          name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED,
          data: {
            object_type: 'payment_intent',
            object: { id: 'int_1' },
          },
        }),
      );
      expect(WebhookEvent.isProcessableEvent(event)).toBe(false);
    });

    it('returns false for payment_intent.succeeded with wrong platform', () => {
      const event = new WebhookEvent(
        createMockPayload({
          name: WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED,
          data: {
            object_type: 'payment_intent',
            object: { id: 'int_1', metadata: { platform: 'shopify' } },
          },
        }),
      );
      expect(WebhookEvent.isProcessableEvent(event)).toBe(false);
    });

    it('returns true for refund.accepted without platform check', () => {
      const event = new WebhookEvent(
        createRefundPayload({
          name: WEBHOOK_EVENTS.REFUND_ACCEPTED,
        }),
      );
      expect(WebhookEvent.isProcessableEvent(event)).toBe(true);
    });

    it('returns false for non-processable event types', () => {
      const nonProcessable = [
        WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_PAYMENT_METHOD,
        WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CUSTOMER_ACTION,
        WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE,
        WEBHOOK_EVENTS.PAYMENT_INTENT_CANCELLED,
        WEBHOOK_EVENTS.REFUND_SETTLED,
        WEBHOOK_EVENTS.REFUND_FAILED,
      ];

      nonProcessable.forEach(name => {
        const event = new WebhookEvent(
          createMockPayload({
            name,
            data: {
              object_type: 'payment_intent',
              object: { id: 'int_1', metadata: { platform: 'salesforce' } },
            },
          }),
        );
        expect(WebhookEvent.isProcessableEvent(event)).toBe(false);
      });
    });

    it('returns false for completely unknown event types', () => {
      const event = new WebhookEvent(
        createMockPayload({
          name: 'some.unknown.event',
        }),
      );
      expect(WebhookEvent.isProcessableEvent(event)).toBe(false);
    });
  });

  describe('Static Factory Methods', () => {
    describe('parse', () => {
      it('parses valid JSON payload', () => {
        const payload = createMockPayload();
        const jsonString = JSON.stringify(payload);

        const event = WebhookEvent.parse(jsonString);

        expect(event).toBeInstanceOf(WebhookEvent);
        expect(event?.id).toBe('evt_test123');
        expect(event?.name).toBe('payment_intent.succeeded');
      });

      it('returns null for invalid JSON', () => {
        const result = WebhookEvent.parse('invalid json {{{');

        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse webhook event', expect.any(Error));
      });

      it('returns null for empty string', () => {
        const result = WebhookEvent.parse('');

        expect(result).toBeNull();
      });
    });

    describe('fromObject', () => {
      it('creates WebhookEvent from object', () => {
        const payload = createMockPayload();

        const event = WebhookEvent.fromObject(payload);

        expect(event).toBeInstanceOf(WebhookEvent);
        expect(event.id).toBe('evt_test123');
      });
    });

    describe('isValidPayload', () => {
      it('returns true for valid payload with required fields', () => {
        const payload = createMockPayload();
        expect(WebhookEvent.isValidPayload(payload)).toBe(true);
      });

      it('returns false when id is missing', () => {
        const payload = createMockPayload();
        delete (payload as Record<string, unknown>).id;
        expect(WebhookEvent.isValidPayload(payload)).toBe(false);
      });

      it('returns false when name is missing', () => {
        const payload = createMockPayload();
        delete (payload as Record<string, unknown>).name;
        expect(WebhookEvent.isValidPayload(payload)).toBe(false);
      });

      it('returns false when data is missing', () => {
        const payload = createMockPayload();
        delete (payload as Record<string, unknown>).data;
        expect(WebhookEvent.isValidPayload(payload)).toBe(false);
      });

      it('returns false for null', () => {
        expect(WebhookEvent.isValidPayload(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(WebhookEvent.isValidPayload(undefined)).toBe(false);
      });

      it('returns false for non-object', () => {
        expect(WebhookEvent.isValidPayload('string')).toBe(false);
        expect(WebhookEvent.isValidPayload(123)).toBe(false);
      });

      it('returns true with minimal valid payload', () => {
        const minimalPayload = {
          id: 'evt_123',
          name: 'payment_intent.succeeded',
          data: {},
        };
        expect(WebhookEvent.isValidPayload(minimalPayload)).toBe(true);
      });
    });
  });
});
