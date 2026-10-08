/**
 * Unit tests for webhookProcessor service
 *
 * Note: The current implementation is a stub that logs events and returns success.
 * These tests verify the logging behavior. When event handling logic is implemented,
 * more comprehensive tests should be added.
 */

const logger = require('../../helpers/logger');

jest.mock('../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../helpers/orderHelper', () => ({
  updateOrderPayment: jest.fn(),
  updateOrderPaymentStatus: jest.fn(),
  getCapturedAmount: jest.fn(),
  setCapturedAmount: jest.fn(),
  getPaymentIntentId: jest.fn(),
  getRefundedAmount: jest.fn(),
  setRefundedAmount: jest.fn(),
}));

jest.mock('../../helpers/paymentHelper', () => ({
  updatePaymentInstrumentTransaction: jest.fn(),
}));

const webhookProcessor = require('../webhookProcessor');
const orderHelper = require('../../helpers/orderHelper');
const OrderMgr = require('dw/order/OrderMgr');
const Order = require('dw/order/Order');
const { processEvent } = webhookProcessor;

// Helper to create a mock webhook event
const createMockPaymentEvent = (overrides = {}) => ({
  id: 'evt_test123',
  name: 'payment_intent.succeeded',
  isPaymentIntentEvent: true,
  isRefundEvent: false,
  isPaymentSucceeded: true,
  isPaymentRequiresCapture: false,
  isPaymentCancelled: false,
  isRefundSucceeded: false,
  isRefundFailed: false,
  paymentIntentId: 'int_abc789',
  merchantOrderId: 'ORDER-001',
  amount: 10000,
  currency: 'USD',
  status: 'SUCCEEDED',
  data: {
    object: {
      merchant_order_id: 'ORDER-001',
    },
  },
  ...overrides,
});

describe('webhookProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvent', () => {
    describe('logging behavior', () => {
      it('logs the processing of events', () => {
        const event = createMockPaymentEvent({
          id: 'evt_log_test',
          name: 'payment_intent.succeeded',
        });

        processEvent(event);

        expect(logger.info).toHaveBeenCalledWith('Processing webhook event', {
          eventId: 'evt_log_test',
          eventName: 'payment_intent.succeeded',
        });
      });

      it('logs unhandled event types', () => {
        const event = createMockPaymentEvent({
          name: 'some.custom.event',
        });

        processEvent(event);

        expect(logger.info).toHaveBeenCalledWith('Unhandled webhook event type', {
          eventName: 'some.custom.event',
        });
      });
    });

    describe('payment_intent.succeeded', () => {
      it('returns success', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: true,
          merchantOrderId: 'ORDER-001',
          amount: 10000,
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });

      it('confirms and marks export-ready an order left pending by a delayed wallet return', () => {
        const order = OrderMgr.getOrder('ORDER-PENDING');
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
        orderHelper.getPaymentIntentId.mockReturnValue('int_abc789');

        const result = processEvent(
          createMockPaymentEvent({
            merchantOrderId: 'ORDER-PENDING',
            data: {
              object: {
                merchant_order_id: 'ORDER-PENDING',
                id: 'int_abc789',
                status: 'SUCCEEDED',
                captured_amount: 100,
                currency: 'USD',
              },
            },
          }),
        );

        expect(result.success).toBe(true);
        expect(order.confirmationStatus).toBe(Order.CONFIRMATION_STATUS_CONFIRMED);
        expect(order.exportStatus).toBe(Order.EXPORT_STATUS_READY);
      });

      it('leaves a fraud-held order unconfirmed when it is already export-ready', () => {
        const order = OrderMgr.getOrder('ORDER-FRAUD');
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);
        orderHelper.getPaymentIntentId.mockReturnValue('int_abc789');

        processEvent(
          createMockPaymentEvent({
            merchantOrderId: 'ORDER-FRAUD',
            data: {
              object: {
                merchant_order_id: 'ORDER-FRAUD',
                id: 'int_abc789',
                status: 'SUCCEEDED',
              },
            },
          }),
        );

        expect(order.confirmationStatus).toBe(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        expect(order.exportStatus).toBe(Order.EXPORT_STATUS_READY);
      });

      it('does not confirm the order when the webhook PaymentIntent does not match', () => {
        const order = OrderMgr.getOrder('ORDER-MISMATCH');
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
        orderHelper.getPaymentIntentId.mockReturnValue('int_stored');

        const result = processEvent(
          createMockPaymentEvent({
            merchantOrderId: 'ORDER-MISMATCH',
            data: {
              object: {
                merchant_order_id: 'ORDER-MISMATCH',
                id: 'int_other',
                status: 'SUCCEEDED',
              },
            },
          }),
        );

        expect(result.success).toBe(true);
        expect(order.confirmationStatus).toBe(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        expect(order.exportStatus).toBe(Order.EXPORT_STATUS_NOTEXPORTED);
        expect(orderHelper.updateOrderPayment).not.toHaveBeenCalled();
      });
    });

    describe('payment_intent.requires_capture', () => {
      it('returns success', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: false,
          isPaymentRequiresCapture: true,
          name: 'payment_intent.requires_capture',
          merchantOrderId: 'ORDER-002',
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });
    });

    describe('payment_intent.cancelled', () => {
      it('returns success', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: false,
          isPaymentCancelled: true,
          name: 'payment_intent.cancelled',
          merchantOrderId: 'ORDER-003',
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });
    });

    describe('refund.settled', () => {
      it('returns success', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: false,
          isPaymentIntentEvent: false,
          isRefundEvent: true,
          isRefundSucceeded: true,
          name: 'refund.settled',
          merchantOrderId: 'ORDER-004',
          refundId: 'ref_123',
          amount: 5000,
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });
    });

    describe('refund.failed', () => {
      it('returns success', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: false,
          isRefundFailed: true,
          name: 'refund.failed',
          merchantOrderId: 'ORDER-005',
          refundId: 'ref_failed',
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });
    });

    describe('unhandled event types', () => {
      it('returns success for unhandled events', () => {
        const event = createMockPaymentEvent({
          isPaymentSucceeded: false,
          isPaymentRequiresCapture: false,
          isPaymentCancelled: false,
          isRefundSucceeded: false,
          isRefundFailed: false,
          name: 'some.other.event',
        });

        const result = processEvent(event);

        expect(result.success).toBe(true);
      });
    });
  });
});

export {};
