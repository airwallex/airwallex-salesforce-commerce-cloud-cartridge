/**
 * Base HTTP client wrapper for Airwallex API
 */

import { getAirwallexService } from './airwallexService';
import { getEnvironment } from '../../helpers/configHelper';
import logger from '../../helpers/logger';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { Environment } from '../../constants/apiEndpoints';
import type { ServiceRequest, ApiResponse, AirwallexApiError } from './types';

/**
 * Make an HTTP request to the Airwallex API
 */
const makeRequest = <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: object,
  headers?: Record<string, string>,
  environment = getEnvironment(),
): ApiResponse<T> => {
  if (!environment) {
    logger.error('Airwallex environment not configured');
    return {
      success: false,
      statusCode: 0,
      error: {
        code: ERROR_CODES.CONFIGURATION_ERROR,
        message: 'Airwallex environment not configured',
      },
    };
  }

  const service = getAirwallexService(environment);

  const request: ServiceRequest = {
    endpoint,
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  };

  logger.logApiRequest(method, endpoint);

  try {
    const result = service.call(request);

    if (result.status === 'OK' && result.object) {
      const response = result.object;
      const statusCode = response.statusCode;

      logger.logApiResponse(method, endpoint, statusCode);

      // Parse response
      if (statusCode >= 200 && statusCode < 300) {
        try {
          const data = response.text ? (JSON.parse(response.text) as T) : undefined;
          return {
            success: true,
            data,
            statusCode,
          };
        } catch (parseError) {
          logger.error('Failed to parse API response', { endpoint, error: String(parseError) });
          return {
            success: false,
            error: {
              code: ERROR_CODES.SERVICE_ERROR,
              message: 'Failed to parse API response',
            },
            statusCode,
          };
        }
      }

      // Handle error response
      let errorData: AirwallexApiError | undefined;
      try {
        const errorText = response.errorText || response.text;
        if (errorText) {
          const parsed = JSON.parse(errorText);
          errorData = {
            code: parsed.code || ERROR_CODES.SERVICE_ERROR,
            message: parsed.message || 'Unknown error',
            source: parsed.source,
          };
        }
      } catch {
        errorData = {
          code: ERROR_CODES.SERVICE_ERROR,
          message: response.errorText || 'Unknown error',
        };
      }

      logger.error('API request failed', { endpoint, statusCode, error: errorData });

      return {
        success: false,
        error: errorData || {
          code: ERROR_CODES.SERVICE_ERROR,
          message: 'Unknown error',
        },
        statusCode,
      };
    }

    // Service call failed
    logger.error('Service call failed', {
      endpoint,
      status: result.status,
      errorMessage: result.errorMessage,
    });

    return {
      success: false,
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: result.errorMessage || 'Service unavailable',
      },
      statusCode: 0,
    };
  } catch (e) {
    const error = e as Error;
    logger.error('API request exception', error);

    return {
      success: false,
      error: {
        code: ERROR_CODES.SERVICE_ERROR,
        message: error.message || 'Unknown error',
      },
      statusCode: 0,
    };
  }
};

/**
 * Make a GET request
 */
const get = <T>(endpoint: string, headers?: Record<string, string>, environment?: Environment): ApiResponse<T> => {
  return makeRequest<T>(endpoint, 'GET', undefined, headers, environment);
};

/**
 * Make a POST request
 */
const post = <T>(
  endpoint: string,
  body: object,
  headers?: Record<string, string>,
  environment?: Environment,
): ApiResponse<T> => {
  return makeRequest<T>(endpoint, 'POST', body, headers, environment);
};

/**
 * Make a PUT request
 */
const put = <T>(
  endpoint: string,
  body: object,
  headers?: Record<string, string>,
  environment?: Environment,
): ApiResponse<T> => {
  return makeRequest<T>(endpoint, 'PUT', body, headers, environment);
};

/**
 * Make a DELETE request
 */
const del = <T>(endpoint: string, headers?: Record<string, string>, environment?: Environment): ApiResponse<T> => {
  return makeRequest<T>(endpoint, 'DELETE', undefined, headers, environment);
};

const baseClient = {
  get,
  post,
  put,
  delete: del,
  makeRequest,
};

module.exports = baseClient;
export default baseClient;
export { get, post, put, del, makeRequest };
