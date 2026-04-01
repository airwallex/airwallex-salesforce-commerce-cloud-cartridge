import UUIDUtils = require('dw/util/UUIDUtils');

const mockUUIDUtils = UUIDUtils as jest.Mocked<typeof UUIDUtils>;

import { authenticatedRequest, generateRequestId, buildQueryString } from '../apiHelper';
import * as authentication from '../authentication';
import logger from '../../../helpers/logger';
import { ERROR_CODES } from '../../../constants/errorCodes';

// Mock dependencies
jest.mock('dw/system/Logger', () => ({}), { virtual: true });
jest.mock('dw/system/Log', () => ({}), { virtual: true });
jest.mock('../authentication');
jest.mock('../../../helpers/logger');

describe('requestHelper', () => {
  const mockGetAuthHeaders = authentication.getAuthHeaders as jest.Mock;
  const mockClearTokenCache = authentication.clearTokenCache as jest.Mock;
  const mockRequestFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestFn.mockReset();
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer token' });
  });

  describe('authenticatedRequest', () => {
    it('should return AUTH_FAILED error if headers cannot be obtained', () => {
      mockGetAuthHeaders.mockReturnValue(null);

      const result = authenticatedRequest(mockRequestFn);

      expect(result).toEqual({
        success: false,
        error: {
          code: ERROR_CODES.AUTH_FAILED,
          message: 'Failed to obtain access token',
        },
        statusCode: 0,
      });
      expect(mockRequestFn).not.toHaveBeenCalled();
    });

    it('should execute request function with headers on success', () => {
      const mockResponse = { success: true, statusCode: 200, data: {} };
      mockRequestFn.mockReturnValue(mockResponse);

      const result = authenticatedRequest(mockRequestFn);

      expect(mockGetAuthHeaders).toHaveBeenCalled();
      expect(mockRequestFn).toHaveBeenCalledWith({ Authorization: 'Bearer token' });
      expect(result).toBe(mockResponse);
    });

    it('should retry on 401 response', () => {
      const failureResponse = { success: false, statusCode: 401, error: { code: 'UNAUTHORIZED' } };
      const successResponse = { success: true, statusCode: 200, data: {} };

      // First call fails, second call succeeds
      mockRequestFn.mockReturnValueOnce(failureResponse).mockReturnValueOnce(successResponse);

      // Second getAuthHeaders call returns new token
      mockGetAuthHeaders
        .mockReturnValueOnce({ Authorization: 'Bearer old_token' })
        .mockReturnValueOnce({ Authorization: 'Bearer new_token' });

      const result = authenticatedRequest(mockRequestFn);

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(mockRequestFn).toHaveBeenNthCalledWith(1, { Authorization: 'Bearer old_token' });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('clearing token cache and retrying'));
      expect(mockClearTokenCache).toHaveBeenCalled();
      expect(mockRequestFn).toHaveBeenNthCalledWith(2, { Authorization: 'Bearer new_token' });
      expect(result).toBe(successResponse);
    });

    it('should not retry if new headers cannot be obtained', () => {
      const failureResponse = { success: false, statusCode: 401, error: { code: 'UNAUTHORIZED' } };
      mockRequestFn.mockReturnValue(failureResponse);

      // First call gets headers, second call returns null
      mockGetAuthHeaders.mockReturnValueOnce({ Authorization: 'Bearer old_token' }).mockReturnValueOnce(null);

      const result = authenticatedRequest(mockRequestFn);

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
      expect(mockClearTokenCache).toHaveBeenCalled();
      expect(result).toBe(failureResponse);
    });

    it('should return failure response if retry also fails', () => {
      const failureResponse = { success: false, statusCode: 401, error: { code: 'UNAUTHORIZED' } };
      mockRequestFn.mockReturnValue(failureResponse);

      const result = authenticatedRequest(mockRequestFn);

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(failureResponse);
    });
  });

  describe('generateRequestId', () => {
    it('returns UUID from UUIDUtils', () => {
      const requestId = generateRequestId();

      expect(requestId).toBe('test-uuid-1234-5678-9abc');
      expect(mockUUIDUtils.createUUID).toHaveBeenCalled();
    });

    it('generates unique request ids', () => {
      mockUUIDUtils.createUUID.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');

      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('buildQueryString', () => {
    it('returns empty string for empty params', () => {
      expect(buildQueryString({})).toBe('');
    });

    it('builds query string with single param', () => {
      expect(buildQueryString({ foo: 'bar' })).toBe('?foo=bar');
    });

    it('builds query string with multiple params', () => {
      const result = buildQueryString({ foo: 'bar', baz: 'qux' });
      expect(result).toContain('foo=bar');
      expect(result).toContain('baz=qux');
      expect(result.startsWith('?')).toBe(true);
      expect(result).toContain('&');
    });

    it('filters out undefined values', () => {
      const result = buildQueryString({ foo: 'bar', skip: undefined, baz: 'qux' });
      expect(result).toContain('foo=bar');
      expect(result).toContain('baz=qux');
      expect(result).not.toContain('skip');
    });

    it('handles boolean values', () => {
      expect(buildQueryString({ active: true })).toBe('?active=true');
      expect(buildQueryString({ active: false })).toBe('?active=false');
    });

    it('handles number values', () => {
      expect(buildQueryString({ page: 0 })).toBe('?page=0');
      expect(buildQueryString({ limit: 100 })).toBe('?limit=100');
    });

    it('encodes string values', () => {
      expect(buildQueryString({ query: 'hello world' })).toBe('?query=hello%20world');
      expect(buildQueryString({ special: 'a&b=c' })).toBe('?special=a%26b%3Dc');
    });

    it('applies param name mapping', () => {
      const result = buildQueryString({ resources_needed: true }, { resources_needed: '__resources' });
      expect(result).toBe('?__resources=true');
    });

    it('uses original name when no mapping exists', () => {
      const result = buildQueryString({ foo: 'bar', mapped: 'value' }, { mapped: 'mapped_to' });
      expect(result).toContain('foo=bar');
      expect(result).toContain('mapped_to=value');
      expect(result).not.toContain('mapped=');
    });

    it('handles mixed param types with mapping', () => {
      const result = buildQueryString(
        {
          currency: 'USD',
          active: true,
          page: 0,
          resources_needed: true,
          skip: undefined,
        },
        { resources_needed: '__resources' },
      );
      expect(result).toContain('currency=USD');
      expect(result).toContain('active=true');
      expect(result).toContain('page=0');
      expect(result).toContain('__resources=true');
      expect(result).not.toContain('skip');
      expect(result).not.toContain('resources_needed');
    });
  });
});
