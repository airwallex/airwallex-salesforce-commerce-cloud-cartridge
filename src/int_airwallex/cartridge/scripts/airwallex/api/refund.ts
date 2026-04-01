/**
 * Refund API client
 */

import baseClient from './baseClient';
import { authenticatedRequest, generateRequestId } from './apiHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import type { ApiResponse, CreateRefundRequest, RefundResponse } from './types';

/**
 * Create a new Refund
 */
const create = (request: CreateRefundRequest): ApiResponse<RefundResponse> => {
  logger.info('Creating Refund', {
    paymentIntentId: request.payment_intent_id,
    amount: request.amount,
  });

  return authenticatedRequest(headers =>
    baseClient.post<RefundResponse>(API_ENDPOINTS.REFUNDS_CREATE, request, headers),
  );
};

/**
 * Get a Refund by ID
 */
const get = (refundId: string): ApiResponse<RefundResponse> => {
  logger.info('Getting Refund', { refundId });

  return authenticatedRequest(headers =>
    baseClient.get<RefundResponse>(API_ENDPOINTS.REFUNDS_GET(refundId), headers),
  );
};

const refundClient = {
  create,
  get,
  generateRequestId,
};

module.exports = refundClient;
export default refundClient;
export { create, get, generateRequestId };
