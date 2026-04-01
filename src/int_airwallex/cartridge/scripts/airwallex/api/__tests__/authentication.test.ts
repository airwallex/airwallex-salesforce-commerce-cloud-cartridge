/**
 * Unit tests for Authentication module
 */

// Mock dependencies before importing the module
jest.mock('../baseClient', () => ({
  post: jest.fn(),
}));

jest.mock('../../../helpers/configHelper', () => ({
  getClientId: jest.fn(),
  getApiKey: jest.fn(),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const CacheMgr = require('dw/system/CacheMgr');

import authentication from '../authentication';
import baseClient from '../baseClient';
import { getClientId, getApiKey } from '../../../helpers/configHelper';
import logger from '../../../helpers/logger';

const { getAccessToken, getAuthHeaders, clearTokenCache, hasCredentials, isTokenValid } = authentication;

const mockBaseClient = baseClient as jest.Mocked<typeof baseClient>;
const mockGetClientId = getClientId as jest.Mock;
const mockGetApiKey = getApiKey as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Authentication', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    CacheMgr._reset();

    // Default mock implementations
    mockGetClientId.mockReturnValue('test-client-id');
    mockGetApiKey.mockReturnValue('test-api-key');
  });

  describe('hasCredentials', () => {
    it('returns true when both clientId and apiKey are configured', () => {
      mockGetClientId.mockReturnValue('client-id');
      mockGetApiKey.mockReturnValue('api-key');

      expect(hasCredentials()).toBe(true);
    });

    it('returns false when clientId is missing', () => {
      mockGetClientId.mockReturnValue(null);
      mockGetApiKey.mockReturnValue('api-key');

      expect(hasCredentials()).toBe(false);
    });

    it('returns false when apiKey is missing', () => {
      mockGetClientId.mockReturnValue('client-id');
      mockGetApiKey.mockReturnValue(null);

      expect(hasCredentials()).toBe(false);
    });

    it('returns false when both are missing', () => {
      mockGetClientId.mockReturnValue(null);
      mockGetApiKey.mockReturnValue(null);

      expect(hasCredentials()).toBe(false);
    });

    it('returns false when clientId is empty string', () => {
      mockGetClientId.mockReturnValue('');
      mockGetApiKey.mockReturnValue('api-key');

      expect(hasCredentials()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('fetches new token when cache is empty', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'new-token-123',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      const token = getAccessToken();

      expect(token).toBe('new-token-123');
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        '/api/v1/authentication/login',
        {},
        {
          'x-client-id': 'test-client-id',
          'x-api-key': 'test-api-key',
        },
        undefined,
      );
    });

    it('returns cached token when not expired', () => {
      // First call - fetch new token
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'cached-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      const token1 = getAccessToken();
      expect(token1).toBe('cached-token');

      // Second call - should return cached token
      const token2 = getAccessToken();
      expect(token2).toBe('cached-token');

      // Should only have called the API once
      expect(mockBaseClient.post).toHaveBeenCalledTimes(1);
    });

    it('fetches new token when cached token is expired', () => {
      // Set up an expired token in cache
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const expiredTime = Date.now() - 1000; // Already expired
      cache.put('access_token', {
        token: 'expired-token',
        expiresAt: expiredTime,
      });

      // Mock the API response
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'fresh-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      const token = getAccessToken();

      expect(token).toBe('fresh-token');
      expect(mockBaseClient.post).toHaveBeenCalledTimes(1);
    });

    it('fetches new token when within refresh buffer (5 min before expiry)', () => {
      // Set up a token that expires in 4 minutes (within 5 min buffer)
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const nearExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes from now
      cache.put('access_token', {
        token: 'near-expiry-token',
        expiresAt: nearExpiry,
      });

      // Mock the API response
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'refreshed-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      const token = getAccessToken();

      expect(token).toBe('refreshed-token');
      expect(mockBaseClient.post).toHaveBeenCalledTimes(1);
    });

    it('returns null when credentials are missing', () => {
      mockGetClientId.mockReturnValue(null);
      mockGetApiKey.mockReturnValue(null);

      const token = getAccessToken();

      expect(token).toBeNull();
      expect(mockBaseClient.post).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing Airwallex credentials',
        expect.objectContaining({
          hasClientId: false,
          hasApiKey: false,
        }),
      );
    });

    it('returns null when API call fails', () => {
      mockBaseClient.post.mockReturnValue({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Invalid credentials',
        },
        statusCode: 401,
      });

      const token = getAccessToken();

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to obtain access token', expect.any(Object));
    });

    it('invalidates expired token before fetching new one', () => {
      // Set up an expired token in cache
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const expiredTime = Date.now() - 1000;
      cache.put('access_token', {
        token: 'expired-token',
        expiresAt: expiredTime,
      });

      // Mock the API response
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'new-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      getAccessToken();

      // Verify invalidate was called
      expect(cache.invalidate).toHaveBeenCalledWith('access_token');
    });

    it('logs success when token is obtained', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'new-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      getAccessToken();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully obtained new access token',
        expect.objectContaining({
          expiresAt: futureDate,
        }),
      );
    });
  });

  describe('isTokenValid', () => {
    it('returns false when no token in cache', () => {
      expect(isTokenValid()).toBe(false);
    });

    it('returns true when token is not expired', () => {
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const futureTime = Date.now() + 30 * 60 * 1000; // 30 minutes from now
      cache.put('access_token', {
        token: 'valid-token',
        expiresAt: futureTime,
      });

      expect(isTokenValid()).toBe(true);
    });

    it('returns false when token is expired', () => {
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const pastTime = Date.now() - 1000; // Already expired
      cache.put('access_token', {
        token: 'expired-token',
        expiresAt: pastTime,
      });

      expect(isTokenValid()).toBe(false);
    });

    it('returns false when token expires within refresh buffer', () => {
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const nearExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes (within 5 min buffer)
      cache.put('access_token', {
        token: 'near-expiry-token',
        expiresAt: nearExpiry,
      });

      expect(isTokenValid()).toBe(false);
    });

    it('returns true when token expires after refresh buffer', () => {
      const cache = CacheMgr.getCache('AirwallexTokenCache');
      const afterBuffer = Date.now() + 6 * 60 * 1000; // 6 minutes (after 5 min buffer)
      cache.put('access_token', {
        token: 'valid-token',
        expiresAt: afterBuffer,
      });

      expect(isTokenValid()).toBe(true);
    });
  });

  describe('getAuthHeaders', () => {
    it('returns headers with Bearer token when token is available', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'auth-token-xyz',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      const headers = getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer auth-token-xyz',
        'Content-Type': 'application/json',
      });
    });

    it('returns null when token cannot be obtained', () => {
      mockGetClientId.mockReturnValue(null);

      const headers = getAuthHeaders();

      expect(headers).toBeNull();
    });

    it('uses cached token for headers', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'cached-auth-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      // First call
      getAuthHeaders();
      // Second call
      const headers = getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer cached-auth-token',
        'Content-Type': 'application/json',
      });
      // Should only fetch once
      expect(mockBaseClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearTokenCache', () => {
    it('invalidates the token cache', () => {
      // First, get a token to populate cache
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'token-to-clear',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      getAccessToken();
      const cache = CacheMgr.getCache('AirwallexTokenCache');

      // Clear the cache
      clearTokenCache();

      expect(cache.invalidate).toHaveBeenCalledWith('access_token');
    });

    it('logs cache clear message', () => {
      clearTokenCache();

      expect(mockLogger.info).toHaveBeenCalledWith('Token cache cleared');
    });

    it('causes next getAccessToken to fetch new token', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'first-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      // Get initial token
      getAccessToken();
      expect(mockBaseClient.post).toHaveBeenCalledTimes(1);

      // Clear cache
      clearTokenCache();

      // Update mock for second token
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'second-token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      // Get token again - should fetch new one
      const token = getAccessToken();
      expect(mockBaseClient.post).toHaveBeenCalledTimes(2);
      expect(token).toBe('second-token');
    });
  });

  describe('fetchNewToken (internal)', () => {
    it('sends correct headers to API', () => {
      mockGetClientId.mockReturnValue('my-client-id');
      mockGetApiKey.mockReturnValue('my-api-key');

      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: {
          token: 'token',
          expires_at: futureDate,
        },
        statusCode: 201,
      });

      getAccessToken();

      expect(mockBaseClient.post).toHaveBeenCalledWith(
        '/api/v1/authentication/login',
        {},
        {
          'x-client-id': 'my-client-id',
          'x-api-key': 'my-api-key',
        },
        undefined,
      );
    });

    it('returns error with correct code when credentials missing', () => {
      mockGetClientId.mockReturnValue(null);
      mockGetApiKey.mockReturnValue('api-key');

      const token = getAccessToken();

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing Airwallex credentials',
        expect.objectContaining({
          hasClientId: false,
          hasApiKey: true,
        }),
      );
    });
  });
});
