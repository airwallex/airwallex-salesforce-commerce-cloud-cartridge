/**
 * Authentication client for Airwallex API
 * Handles token management and caching using CacheMgr
 */

import baseClient from './baseClient';
import { getClientId, getApiKey } from '../../helpers/configHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import { ERROR_CODES } from '../../constants/errorCodes';
import CacheMgr = require('dw/system/CacheMgr');

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

/**
 * Get an access token (from cache or fetch new)
 */
const getAccessToken = (): string | null => {
  const cache = getCache();

  // Try to get from cache
  const cachedToken = cache.get(CACHE_KEY) as CachedToken | null;

  // If we have a valid cached token, return it
  if (cachedToken && !isTokenExpired(cachedToken)) {
    return cachedToken.token;
  }

  // Token is missing or expired, fetch new one
  if (cachedToken) {
    // Invalidate expired token
    cache.invalidate(CACHE_KEY);
  }

  const response = fetchNewToken();

  if (response.success && response.data) {
    // Store in cache
    const newCachedToken: CachedToken = {
      token: response.data.token,
      expiresAt: new Date(response.data.expires_at).getTime(),
    };

    cache.put(CACHE_KEY, newCachedToken);

    return response.data.token;
  }

  return null;
};

/**
 * Check if the cached token is still valid
 */
const isTokenValid = (): boolean => {
  const cache = getCache();
  const cachedToken = cache.get(CACHE_KEY) as CachedToken | null;

  if (!cachedToken) {
    return false;
  }

  return !isTokenExpired(cachedToken);
};

/**
 * Get authorization headers for API requests
 */
const getAuthHeaders = (): Record<string, string> | null => {
  const token = getAccessToken();

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
const clearTokenCache = (): void => {
  const cache = getCache();
  cache.invalidate(CACHE_KEY);
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
  fetchNewToken,
  getAuthHeaders,
  clearTokenCache,
  hasCredentials,
  isTokenValid,
};

module.exports = authentication;
export default authentication;
export { getAccessToken, fetchNewToken, getAuthHeaders, clearTokenCache, hasCredentials, isTokenValid };
