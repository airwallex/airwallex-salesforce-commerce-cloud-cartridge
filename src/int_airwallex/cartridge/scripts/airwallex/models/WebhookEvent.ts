/**
 * Webhook Event domain model
 */

import logger from '../../helpers/logger';
import { PLATFORM_IDENTIFIER } from '../../constants/appConfig';

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  // Payment Intent events
  PAYMENT_INTENT_REQUIRES_PAYMENT_METHOD: 'payment_intent.requires_payment_method',
  PAYMENT_INTENT_REQUIRES_CUSTOMER_ACTION: 'payment_intent.requires_customer_action',
  PAYMENT_INTENT_REQUIRES_CAPTURE: 'payment_intent.requires_capture',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_CANCELLED: 'payment_intent.cancelled',

  // Refund events
  REFUND_ACCEPTED: 'refund.accepted',
  REFUND_SETTLED: 'refund.settled',
  REFUND_FAILED: 'refund.failed',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

/**
 * Event types that should be persisted and processed.
 * All other event types are discarded on arrival.
 */
export const PROCESSABLE_EVENT_TYPES: ReadonlySet<string> = new Set([
  WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED,
  WEBHOOK_EVENTS.REFUND_ACCEPTED,
]);

/**
 * WebhookEvent domain class
 * Parses and provides typed access to webhook payloads
 */
class WebhookEvent {
  readonly id: string;
  readonly name: string;
  readonly accountId: string;
  readonly data: {
    object_type: string;
    object: Record<string, unknown>;
  };
  readonly createdAt: string;
  readonly sourceId?: string;

  constructor(payload: Record<string, unknown>) {
    this.id = payload.id as string;
    this.name = payload.name as string;
    this.accountId = (payload.accountId as string) || (payload.account_id as string);
    this.data = payload.data as { object_type: string; object: Record<string, unknown> };
    this.createdAt = (payload.createdAt as string) || (payload.created_at as string);
    this.sourceId = (payload.sourceId as string) || (payload.source_id as string);
  }

  // =========================================================================
  // Event Type Checks
  // =========================================================================

  /**
   * Check if this is a payment intent event
   */
  get isPaymentIntentEvent(): boolean {
    return this.name.startsWith('payment_intent.');
  }

  /**
   * Check if this is a refund event
   */
  get isRefundEvent(): boolean {
    return this.name.startsWith('refund.');
  }

  /**
   * Check if the payment intent succeeded
   */
  get isPaymentSucceeded(): boolean {
    return this.name === WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED;
  }

  /**
   * Check if the payment intent requires capture
   */
  get isPaymentRequiresCapture(): boolean {
    return this.name === WEBHOOK_EVENTS.PAYMENT_INTENT_REQUIRES_CAPTURE;
  }

  /**
   * Check if the payment intent was cancelled
   */
  get isPaymentCancelled(): boolean {
    return this.name === WEBHOOK_EVENTS.PAYMENT_INTENT_CANCELLED;
  }

  /**
   * Check if a refund succeeded
   */
  get isRefundSucceeded(): boolean {
    return this.name === WEBHOOK_EVENTS.REFUND_ACCEPTED || this.name === WEBHOOK_EVENTS.REFUND_SETTLED;
  }

  /**
   * Check if a refund failed
   */
  get isRefundFailed(): boolean {
    return this.name === WEBHOOK_EVENTS.REFUND_FAILED;
  }

  // =========================================================================
  // Data Accessors
  // =========================================================================

  /**
   * Get the object type from the event data
   */
  get objectType(): string {
    return this.data?.object_type || '';
  }

  /**
   * Get the object from the event data
   */
  get object(): Record<string, unknown> {
    return this.data?.object || {};
  }

  /**
   * Get the Payment Intent ID from the event
   */
  get paymentIntentId(): string | null {
    if (this.isPaymentIntentEvent) {
      return (this.object.id as string) || null;
    }
    if (this.isRefundEvent) {
      return (this.object.payment_intent_id as string) || null;
    }
    return null;
  }

  /**
   * Get the merchant order ID from the event
   */
  get merchantOrderId(): string | null {
    return (this.object.merchant_order_id as string) || null;
  }

  /**
   * Get the refund ID from the event (for refund events)
   */
  get refundId(): string | null {
    if (this.isRefundEvent) {
      return (this.object.id as string) || null;
    }
    return null;
  }

  /**
   * Get the amount from the event
   */
  get amount(): number | null {
    return (this.object.amount as number) || null;
  }

  /**
   * Get the currency from the event
   */
  get currency(): string | null {
    return (this.object.currency as string) || null;
  }

  /**
   * Get the status from the event object
   */
  get status(): string | null {
    return (this.object.status as string) || null;
  }

  /**
   * Get the metadata from the event object
   */
  get metadata(): Record<string, string> | null {
    return (this.object.metadata as Record<string, string>) || null;
  }

  /**
   * Get the platform identifier from the event metadata
   */
  get platform(): string | null {
    return this.metadata?.platform || null;
  }

  // =========================================================================
  // Static Factory Methods
  // =========================================================================

  /**
   * Parse a webhook event from a JSON string
   */
  static parse(jsonPayload: string): WebhookEvent | null {
    try {
      const payload = JSON.parse(jsonPayload);
      return new WebhookEvent(payload);
    } catch (e) {
      logger.error('Failed to parse webhook event', e as Error);
      return null;
    }
  }

  /**
   * Create a WebhookEvent from a parsed object
   */
  static fromObject(payload: Record<string, unknown>): WebhookEvent {
    return new WebhookEvent(payload);
  }

  /**
   * Check whether the event should be persisted and processed.
   *
   * Rules:
   * 1. The event type must be in PROCESSABLE_EVENT_TYPES.
   * 2. For payment_intent events the metadata.platform must match
   *    our PLATFORM_IDENTIFIER so we only handle our own intents.
   *    Refund events do not carry the parent PI metadata, so we
   *    skip the platform check for those.
   */
  static isProcessableEvent(event: WebhookEvent): boolean {
    if (!PROCESSABLE_EVENT_TYPES.has(event.name)) {
      return false;
    }

    if (event.isPaymentIntentEvent && event.platform !== PLATFORM_IDENTIFIER) {
      return false;
    }

    return true;
  }

  /**
   * Validate the basic structure of a webhook event
   */
  static isValidPayload(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const obj = payload as Record<string, unknown>;
    return !!(obj.id && obj.name && obj.data);
  }
}

module.exports = WebhookEvent;
module.exports.WEBHOOK_EVENTS = WEBHOOK_EVENTS;
module.exports.PROCESSABLE_EVENT_TYPES = PROCESSABLE_EVENT_TYPES;
export default WebhookEvent;
