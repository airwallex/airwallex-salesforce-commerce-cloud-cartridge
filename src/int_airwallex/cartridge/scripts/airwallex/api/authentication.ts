/**
 * Authentication client for Airwallex API
 * Handles token management and caching using CacheMgr
 */

import baseClient from './baseClient';
import { getClientId, getApiKey, getEnvironment } from '../../helpers/configHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import { ERROR_CODES } from '../../constants/errorCodes';
import CacheMgr = require('dw/system/CacheMgr');
import Site = require('dw/system/Site');

import type { Environment } from '../../constants/apiEndpoints';
import type { AuthTokenResponse, ApiResponse } from './types';

// Cache configuration
const CACHE_ID = 'AirwallexTokenCache';
const CACHE_KEY = 'access_token';

// Token refresh buffer (refresh 5 minutes before expiry)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Token cache structure
interface CachedToken {
  token: string;
  expiresAt: number; // timestamp in ms
}

/**
 * Get the cache instance
 */
const getCache = () => {
  return CacheMgr.getCache(CACHE_ID);
};

const getCacheKey = (environment?: Environment): string => {
  if (!environment) {
    return CACHE_KEY;
  }
  const site = Site.getCurrent();
  const clientId = getClientId(environment) || 'unknown';
  return `${CACHE_KEY}:${site ? site.ID : 'unknown'}:${environment}:${clientId}`;
};

/**
 * Get a new access token from Airwallex
 */
const fetchNewToken = (
  environment?: Environment,
  clientId?: string,
  apiKey?: string,
): ApiResponse<AuthTokenResponse> => {
  const resolvedClientId = clientId ?? getClientId(environment);
  const resolvedApiKey = apiKey ?? getApiKey(environment);

  if (!resolvedClientId || !resolvedApiKey) {
    logger.error('Missing Airwallex credentials', {
      hasClientId: !!resolvedClientId,
      hasApiKey: !!resolvedApiKey,
    });

    return {
      success: false,
      error: {
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'Airwallex Client ID or API Key is not configured',
      },
      statusCode: 0,
    };
  }

  const response = baseClient.post<AuthTokenResponse>(
    API_ENDPOINTS.AUTH_LOGIN,
    {},
    {
      'x-client-id': resolvedClientId,
      'x-api-key': resolvedApiKey,
    },
    environment,
  );

  if (response.success && response.data) {
    logger.info('Successfully obtained new access token', {
      expiresAt: response.data.expires_at,
    });
  } else {
    logger.error('Failed to obtain access token', {
      error: response.error,
    });
  }

  return response;
};

/**
 * Check if a cached token is still valid (with buffer)
 */
const isTokenExpired = (cachedToken: CachedToken): boolean => {
  const now = Date.now();
  return now >= cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS;
};

const attachTokenToAirTracker = (environment: Environment | undefined, token: string): void => {
  if (!environment) {
    return;
  }

  try {
    // Lazy loading avoids the authentication -> logger -> AirTracker dependency cycle.
    const airTracker = require('../../helpers/airTracker') as {
      setBufferedLoggingContext: (trackingEnvironment: Environment, accessToken: string) => boolean;
    };
    airTracker.setBufferedLoggingContext(environment, token);
  } catch {
    // Remote diagnostics must never interfere with authentication.
  }
};

/**
 * Get an access token (from cache or fetch new)
 */
const getAccessToken = (environment = getEnvironment()): string | null => {
  const cache = getCache();
  const cacheKey = getCacheKey(environment);

  // Try to get from cache
  const cachedToken = cache.get(cacheKey) as CachedToken | null;

  // If we have a valid cached token, return it
  if (cachedToken && !isTokenExpired(cachedToken)) {
    attachTokenToAirTracker(environment, cachedToken.token);
    return cachedToken.token;
  }

  // Token is missing or expired, fetch new one
  if (cachedToken) {
    // Invalidate expired token
    cache.invalidate(cacheKey);
  }

  const response = fetchNewToken(environment);

  if (response.success && response.data) {
    // Store in cache
    const newCachedToken: CachedToken = {
      token: response.data.token,
      expiresAt: new Date(response.data.expires_at).getTime(),
    };

    cache.put(cacheKey, newCachedToken);
    attachTokenToAirTracker(environment, response.data.token);

    return response.data.token;
  }

  return null;
};

/**
 * Read a cached token without making a network request.
 */
const getCachedAccessToken = (environment = getEnvironment()): string | null => {
  const cachedToken = getCache().get(getCacheKey(environment)) as CachedToken | null;
  return cachedToken && !isTokenExpired(cachedToken) ? cachedToken.token : null;
};

/**
 * Check if the cached token is still valid
 */
const isTokenValid = (environment = getEnvironment()): boolean => {
  const cache = getCache();
  const cachedToken = cache.get(getCacheKey(environment)) as CachedToken | null;

  if (!cachedToken) {
    return false;
  }

  return !isTokenExpired(cachedToken);
};

/**
 * Get authorization headers for API requests
 */
const getAuthHeaders = (environment = getEnvironment()): Record<string, string> | null => {
  const token = getAccessToken(environment);

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Clear the token cache (useful for testing or on auth errors)
 */
const clearTokenCache = (environment = getEnvironment()): void => {
  const cache = getCache();
  cache.invalidate(getCacheKey(environment));
  logger.info('Token cache cleared');
};

/**
 * Check if credentials are configured
 */
const hasCredentials = (): boolean => {
  const clientId = getClientId();
  const apiKey = getApiKey();
  return !!(clientId && apiKey);
};

const authentication = {
  getAccessToken,
  getCachedAccessToken,
  fetchNewToken,
  getAuthHeaders,
  clearTokenCache,
  hasCredentials,
  isTokenValid,
};

module.exports = authentication;
export default authentication;
export {
  getAccessToken,
  getCachedAccessToken,
  fetchNewToken,
  getAuthHeaders,
  clearTokenCache,
  hasCredentials,
  isTokenValid,
};
