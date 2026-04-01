/**
 * Refund domain model
 */

import refundClient from '../api/refund';
import { REFUND_STATUS, RefundStatus } from '../../constants/paymentStatus';
import logger from '../../helpers/logger';
import type { RefundResponse, CreateRefundRequest } from '../api/types';

/**
 * Refund domain class
 * Encapsulates business logic for Airwallex Refunds
 */
class Refund {
  readonly id: string;
  readonly paymentIntentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: RefundStatus;
  readonly reason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: RefundResponse) {
    this.id = data.id;
    this.paymentIntentId = data.payment_intent_id;
    this.amount = data.amount;
    this.currency = data.currency;
    this.status = data.status;
    this.reason = data.reason;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }

  // =========================================================================
  // Status Checks
  // =========================================================================

  /**
   * Check if the refund is in received state
   */
  get isReceived(): boolean {
    return this.status === REFUND_STATUS.RECEIVED;
  }

  /**
   * Check if the refund is accepted
   */
  get isAccepted(): boolean {
    return this.status === REFUND_STATUS.ACCEPTED;
  }

  /**
   * Check if the refund has succeeded
   */
  get isSucceeded(): boolean {
    return this.status === REFUND_STATUS.SUCCEEDED;
  }

  /**
   * Check if the refund has failed
   */
  get isFailed(): boolean {
    return this.status === REFUND_STATUS.FAILED;
  }

  /**
   * Check if the refund can be considered completed
   */
  get isCompleted(): boolean {
    return this.isAccepted || this.isSucceeded;
  }

  /**
   * Check if the refund is in progress
   */
  get isInProgress(): boolean {
    return this.isReceived;
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Refresh the refund from the API
   */
  refresh(): Refund | null {
    const response = refundClient.get(this.id);

    if (response.success && response.data) {
      return new Refund(response.data);
    }

    logger.error('Failed to refresh Refund', {
      id: this.id,
      error: response.error,
    });
    return null;
  }

  // =========================================================================
  // Static Factory Methods
  // =========================================================================

  /**
   * Create a new Refund
   */
  static create(params: {
    paymentIntentId: string;
    amount: number;
    reason?: string;
    metadata?: Record<string, string>;
  }): Refund | null {
    const request: CreateRefundRequest = {
      payment_intent_id: params.paymentIntentId,
      amount: params.amount,
      reason: params.reason,
      request_id: refundClient.generateRequestId(),
      metadata: params.metadata,
    };

    const response = refundClient.create(request);

    if (response.success && response.data) {
      logger.info('Refund created', {
        id: response.data.id,
        paymentIntentId: params.paymentIntentId,
        amount: params.amount,
      });
      return new Refund(response.data);
    }

    logger.error('Failed to create Refund', {
      paymentIntentId: params.paymentIntentId,
      error: response.error,
    });
    return null;
  }

  /**
   * Get a Refund by ID
   */
  static getById(refundId: string): Refund | null {
    const response = refundClient.get(refundId);

    if (response.success && response.data) {
      return new Refund(response.data);
    }

    logger.error('Failed to get Refund', {
      id: refundId,
      error: response.error,
    });
    return null;
  }

  /**
   * Create a Refund from API response data
   */
  static fromResponse(data: RefundResponse): Refund {
    return new Refund(data);
  }
}

module.exports = Refund;
export default Refund;
