/**
 * Payment Intent API client
 */

import baseClient from './baseClient';
import { authenticatedRequest, generateRequestId } from './apiHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import type {
  ApiResponse,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  ConfirmPaymentIntentRequest,
  CapturePaymentIntentRequest,
  CancelPaymentIntentRequest,
} from './types';

/**
 * Create a new Payment Intent
 */
const create = (request: CreatePaymentIntentRequest): ApiResponse<PaymentIntentResponse> => {
  logger.info('Creating PaymentIntent', {
    merchantOrderId: request.merchant_order_id,
    amount: request.amount,
    currency: request.currency,
  });

  return authenticatedRequest(headers =>
    baseClient.post<PaymentIntentResponse>(API_ENDPOINTS.PAYMENT_INTENTS_CREATE, request, headers),
  );
};

/**
 * Get a Payment Intent by ID
 */
const get = (paymentIntentId: string): ApiResponse<PaymentIntentResponse> => {
  logger.info('Getting PaymentIntent', { paymentIntentId });

  return authenticatedRequest(headers =>
    baseClient.get<PaymentIntentResponse>(API_ENDPOINTS.PAYMENT_INTENTS_GET(paymentIntentId), headers),
  );
};

/**
 * Confirm a Payment Intent
 */
const confirm = (paymentIntentId: string, request: ConfirmPaymentIntentRequest): ApiResponse<PaymentIntentResponse> => {
  logger.info('Confirming PaymentIntent', { paymentIntentId });

  return authenticatedRequest(headers =>
    baseClient.post<PaymentIntentResponse>(API_ENDPOINTS.PAYMENT_INTENTS_CONFIRM(paymentIntentId), request, headers),
  );
};

/**
 * Capture a Payment Intent
 */
const capture = (paymentIntentId: string, request: CapturePaymentIntentRequest): ApiResponse<PaymentIntentResponse> => {
  logger.info('Capturing PaymentIntent', {
    paymentIntentId,
    amount: request.amount,
  });

  return authenticatedRequest(headers =>
    baseClient.post<PaymentIntentResponse>(API_ENDPOINTS.PAYMENT_INTENTS_CAPTURE(paymentIntentId), request, headers),
  );
};

/**
 * Cancel a Payment Intent
 */
const cancel = (paymentIntentId: string, request: CancelPaymentIntentRequest): ApiResponse<PaymentIntentResponse> => {
  logger.info('Cancelling PaymentIntent', { paymentIntentId });

  return authenticatedRequest(headers =>
    baseClient.post<PaymentIntentResponse>(API_ENDPOINTS.PAYMENT_INTENTS_CANCEL(paymentIntentId), request, headers),
  );
};

const paymentIntentClient = {
  create,
  get,
  confirm,
  capture,
  cancel,
  generateRequestId,
};

module.exports = paymentIntentClient;
export default paymentIntentClient;
export { create, get, confirm, capture, cancel, generateRequestId };
