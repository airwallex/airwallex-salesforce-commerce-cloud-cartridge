/**
 * PaymentIntent domain model
 */

import paymentIntentClient from '../api/paymentIntent';
import { PAYMENT_INTENT_STATUS, PaymentIntentStatus } from '../../constants/paymentStatus';
import { VERSION, getReferrerType, AppName, PLATFORM_IDENTIFIER } from '../../constants/appConfig';
import logger from '../../helpers/logger';
import type {
  PaymentIntentResponse,
  CreatePaymentIntentRequest,
  Order,
  CustomerDetails,
  PaymentMethodOptions,
  NextAction,
  PaymentAttempt,
} from '../api/types';

/**
 * PaymentIntent domain class
 * Encapsulates business logic for Airwallex Payment Intents
 */
class PaymentIntent {
  readonly id: string;
  readonly clientSecret: string;
  readonly amount: number;
  readonly currency: string;
  readonly baseAmount?: number;
  readonly baseCurrency?: string;
  readonly status: PaymentIntentStatus;
  readonly merchantOrderId: string;
  readonly capturedAmount: number;
  readonly refundedAmount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata?: Record<string, string>;
  readonly order?: Order;
  readonly customerId?: string;
  readonly customer?: CustomerDetails;
  readonly descriptor?: string;
  readonly nextAction?: NextAction;
  readonly connectedAccountId?: string;
  readonly availablePaymentMethodTypes?: string[];
  readonly paymentMethodType?: string;
  readonly latestPaymentAttempt?: PaymentAttempt;

  constructor(data: PaymentIntentResponse) {
    this.id = data.id;
    this.clientSecret = data.client_secret;
    this.amount = data.amount;
    this.currency = data.currency;
    this.baseAmount = data.base_amount;
    this.baseCurrency = data.base_currency;
    this.status = data.status;
    this.merchantOrderId = data.merchant_order_id;
    this.capturedAmount = data.captured_amount || 0;
    this.refundedAmount = data.latest_payment_attempt?.refunded_amount || 0;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.metadata = data.metadata;
    this.order = data.order;
    this.customerId = data.customer_id;
    this.customer = data.customer;
    this.descriptor = data.descriptor;
    this.nextAction = data.next_action;
    this.connectedAccountId = data.connected_account_id;
    this.availablePaymentMethodTypes = data.available_payment_method_types;
    this.paymentMethodType = data.latest_payment_attempt?.payment_method?.type;
    this.latestPaymentAttempt = data.latest_payment_attempt;
  }

  // =========================================================================
  // Status Checks
  // =========================================================================

  /**
   * Check if the payment requires a payment method
   */
  get requiresPaymentMethod(): boolean {
    return this.status === PAYMENT_INTENT_STATUS.REQUIRES_PAYMENT_METHOD;
  }

  /**
   * Check if the payment requires customer action (e.g., 3DS)
   */
  get requiresCustomerAction(): boolean {
    return this.status === PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION;
  }

  /**
   * Check if the payment requires capture
   */
  get requiresCapture(): boolean {
    return this.status === PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE;
  }

  /**
   * Check if the payment has succeeded
   */
  get isSucceeded(): boolean {
    return this.status === PAYMENT_INTENT_STATUS.SUCCEEDED;
  }

  /**
   * Check if the payment has been cancelled
   */
  get isCancelled(): boolean {
    return this.status === PAYMENT_INTENT_STATUS.CANCELLED;
  }

  /**
   * Check if the payment is in a final state
   */
  get isFinalState(): boolean {
    return this.isSucceeded || this.isCancelled;
  }

  /**
   * Check if the payment can be captured
   */
  get canCapture(): boolean {
    return this.requiresCapture && this.remainingAmount > 0;
  }

  /**
   * Check if the payment can be cancelled
   */
  get canCancel(): boolean {
    return this.requiresCapture;
  }

  /**
   * Check if the payment can be refunded
   */
  get canRefund(): boolean {
    return this.isSucceeded && this.refundableAmount > 0;
  }

  // =========================================================================
  // Amount Calculations
  // =========================================================================

  /**
   * Get the remaining amount that can be captured
   */
  get remainingAmount(): number {
    return this.amount - this.capturedAmount;
  }

  /**
   * Get the amount that can be refunded
   */
  get refundableAmount(): number {
    return this.capturedAmount - this.refundedAmount;
  }

  /**
   * Check if the payment is fully captured
   */
  get isFullyCaptured(): boolean {
    return this.capturedAmount >= this.amount;
  }

  /**
   * Check if the payment is fully refunded
   */
  get isFullyRefunded(): boolean {
    return this.refundedAmount >= this.capturedAmount;
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Capture the payment intent
   */
  capture(amount?: number): PaymentIntent | null {
    if (!this.canCapture) {
      logger.warn('Cannot capture PaymentIntent', {
        id: this.id,
        status: this.status,
        remainingAmount: this.remainingAmount,
      });
      return null;
    }

    const captureAmount = amount || this.remainingAmount;
    const response = paymentIntentClient.capture(this.id, {
      amount: captureAmount,
      request_id: paymentIntentClient.generateRequestId(),
    });

    if (response.success && response.data) {
      return new PaymentIntent(response.data);
    }

    logger.error('Failed to capture PaymentIntent', {
      id: this.id,
      error: response.error,
    });
    return null;
  }

  /**
   * Cancel the payment intent
   */
  cancel(reason?: string): PaymentIntent | null {
    if (!this.canCancel) {
      logger.warn('Cannot cancel PaymentIntent', {
        id: this.id,
        status: this.status,
      });
      return null;
    }

    const response = paymentIntentClient.cancel(this.id, {
      request_id: paymentIntentClient.generateRequestId(),
      cancellation_reason: reason,
    });

    if (response.success && response.data) {
      return new PaymentIntent(response.data);
    }

    logger.error('Failed to cancel PaymentIntent', {
      id: this.id,
      error: response.error,
    });
    return null;
  }

  /**
   * Refresh the payment intent from the API
   */
  refresh(): PaymentIntent | null {
    const response = paymentIntentClient.get(this.id);

    if (response.success && response.data) {
      return new PaymentIntent(response.data);
    }

    logger.error('Failed to refresh PaymentIntent', {
      id: this.id,
      error: response.error,
    });
    return null;
  }

  // =========================================================================
  // Static Factory Methods
  // =========================================================================

  static create(params: {
    appName: AppName;
    amount: number;
    currency: string;
    orderId: string;
    returnUrl?: string;
    metadata?: Record<string, string>;
    order?: Order;
    customerId?: string;
    customer?: CustomerDetails;
    descriptor?: string;
    paymentMethodOptions?: PaymentMethodOptions;
  }): PaymentIntent | null {
    const request: CreatePaymentIntentRequest = {
      amount: params.amount,
      currency: params.currency,
      merchant_order_id: params.orderId,
      request_id: paymentIntentClient.generateRequestId(),
      return_url: params.returnUrl,
      metadata: {
        ...params.metadata,
        platform: PLATFORM_IDENTIFIER,
      },
      order: params.order,
      customer_id: params.customerId,
      customer: params.customer,
      descriptor: params.descriptor,
      payment_method_options: params.paymentMethodOptions,
      referrer_data: {
        type: getReferrerType(params.appName),
        version: VERSION,
      },
    };

    const response = paymentIntentClient.create(request);

    if (response.success && response.data) {
      logger.info('PaymentIntent created', {
        id: response.data.id,
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency,
      });
      return new PaymentIntent(response.data);
    }

    logger.error('Failed to create PaymentIntent', {
      orderId: params.orderId,
      error: response.error,
    });
    return null;
  }

  /**
   * Get a PaymentIntent by ID
   */
  static getById(paymentIntentId: string): PaymentIntent | null {
    const response = paymentIntentClient.get(paymentIntentId);

    if (response.success && response.data) {
      return new PaymentIntent(response.data);
    }

    logger.error('Failed to get PaymentIntent', {
      id: paymentIntentId,
      error: response.error,
    });
    return null;
  }

  /**
   * Create a PaymentIntent from API response data
   */
  static fromResponse(data: PaymentIntentResponse): PaymentIntent {
    return new PaymentIntent(data);
  }
}

module.exports = PaymentIntent;
export default PaymentIntent;
