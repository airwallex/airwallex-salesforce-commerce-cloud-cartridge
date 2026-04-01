/**
 * Merchant Config API client
 */

import baseClient from './baseClient';
import { authenticatedRequest, buildQueryString } from './apiHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import type { Environment } from '../../constants/apiEndpoints';
import type { ApiResponse, QueryPaymentMethodTypesRequest, PaymentMethodTypesResponse } from './types';

/**
 * Map request param names to API query param names
 */
const PARAM_NAME_MAP: Record<string, string> = {
  resources_needed: '__resources',
};

/**
 * Query available payment method types (uses stored credentials and cached token)
 */
const queryPaymentMethodTypes = (
  params: QueryPaymentMethodTypesRequest = {},
): ApiResponse<PaymentMethodTypesResponse> => {
  logger.info('Querying payment method types', {
    transactionCurrency: params.transaction_currency,
    countryCode: params.country_code,
    transactionMode: params.transaction_mode,
  });

  const queryString = buildQueryString(params, PARAM_NAME_MAP);
  const url = `${API_ENDPOINTS.PAYMENT_METHOD_TYPES}${queryString}`;

  return authenticatedRequest(headers => baseClient.get<PaymentMethodTypesResponse>(url, headers));
};

/**
 * Query payment method types with explicit credentials (environment + access token)
 * Used when credentials are supplied in the request (e.g. pre-save verification in settings UI)
 */
const queryPaymentMethodTypesWithToken = (
  params: QueryPaymentMethodTypesRequest = {},
  environment: Environment,
  accessToken: string,
): ApiResponse<PaymentMethodTypesResponse> => {
  logger.info('Querying payment method types with token', {
    environment,
    transactionCurrency: params.transaction_currency,
    countryCode: params.country_code,
    transactionMode: params.transaction_mode,
  });

  const queryString = buildQueryString(params, PARAM_NAME_MAP);
  const url = `${API_ENDPOINTS.PAYMENT_METHOD_TYPES}${queryString}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  return baseClient.get<PaymentMethodTypesResponse>(url, headers, environment);
};

const merchantConfigClient = {
  queryPaymentMethodTypes,
  queryPaymentMethodTypesWithToken,
};

module.exports = merchantConfigClient;
export default merchantConfigClient;
export { queryPaymentMethodTypes, queryPaymentMethodTypesWithToken };
