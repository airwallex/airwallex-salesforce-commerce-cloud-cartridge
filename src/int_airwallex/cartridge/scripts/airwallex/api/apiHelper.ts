/**
 * Request helper for Airwallex API
 */

import { getAuthHeaders, clearTokenCache } from './authentication';
import logger from '../../helpers/logger';
import { ERROR_CODES } from '../../constants/errorCodes';
import UUIDUtils = require('dw/util/UUIDUtils');
import type { ApiResponse } from './types';

/**
 * Make an authenticated API request with retry on auth failure
 */
const authenticatedRequest = <T>(requestFn: (headers: Record<string, string>) => ApiResponse<T>): ApiResponse<T> => {
  const headers = getAuthHeaders();

  if (!headers) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.AUTH_FAILED,
        message: 'Failed to obtain access token',
      },
      statusCode: 0,
    };
  }

  const response = requestFn(headers);

  // If unauthorized, clear cache and retry once
  if (response.statusCode === 401) {
    logger.info('Received 401, clearing token cache and retrying');
    clearTokenCache();

    const newHeaders = getAuthHeaders();
    if (newHeaders) {
      return requestFn(newHeaders);
    }
  }

  return response;
};

const generateRequestId = (): string => {
  return UUIDUtils.createUUID();
};

/**
 * Build a query string from an object of parameters
 * @param params - Object containing query parameters
 * @param paramNameMap - Optional mapping of param names to API query param names
 * @returns Query string with leading "?" or empty string if no params
 */
const buildQueryString = <T extends object>(params: T, paramNameMap: Record<string, string> = {}): string => {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const paramName = paramNameMap[key] || key;
      const encodedValue = typeof value === 'string' ? encodeURIComponent(value) : value;
      return `${paramName}=${encodedValue}`;
    });

  return parts.length > 0 ? `?${parts.join('&')}` : '';
};

const requestHelper = {
  authenticatedRequest,
  generateRequestId,
  buildQueryString,
};

module.exports = requestHelper;
export default requestHelper;
export { authenticatedRequest, generateRequestId, buildQueryString };
