/**
 * Unit tests for BaseClient module
 */

// Mock dependencies before importing the module
jest.mock('../airwallexService', () => ({
  getAirwallexService: jest.fn(),
}));

jest.mock('../../../helpers/configHelper', () => ({
  getEnvironment: jest.fn(),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logApiRequest: jest.fn(),
  logApiResponse: jest.fn(),
}));

import baseClient from '../baseClient';
import { getAirwallexService } from '../airwallexService';
import { getEnvironment } from '../../../helpers/configHelper';
import logger from '../../../helpers/logger';
import { ERROR_CODES } from '../../../constants/errorCodes';

const { get, post, put, delete: del, makeRequest } = baseClient;

const mockGetAirwallexService = getAirwallexService as jest.Mock;
const mockGetEnvironment = getEnvironment as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockService = (callResult: any) => ({
  call: jest.fn().mockReturnValue(callResult),
});

describe('BaseClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvironment.mockReturnValue('demo');
  });

  describe('makeRequest', () => {
    describe('configuration', () => {
      it('returns error when environment is not configured', () => {
        mockGetEnvironment.mockReturnValue(null);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          statusCode: 0,
          error: {
            code: ERROR_CODES.CONFIGURATION_ERROR,
            message: 'Airwallex environment not configured',
          },
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Airwallex environment not configured');
      });

      it('uses configured environment to get service', () => {
        mockGetEnvironment.mockReturnValue('production');
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'GET');

        expect(mockGetAirwallexService).toHaveBeenCalledWith('production');
      });
    });

    describe('request building', () => {
      it('passes endpoint and method to service', () => {
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/v1/test', 'POST');

        expect(mockService.call).toHaveBeenCalledWith({
          endpoint: '/api/v1/test',
          method: 'POST',
          body: undefined,
          headers: undefined,
        });
      });

      it('stringifies body object', () => {
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'POST', { key: 'value', number: 123 });

        expect(mockService.call).toHaveBeenCalledWith({
          endpoint: '/api/test',
          method: 'POST',
          body: '{"key":"value","number":123}',
          headers: undefined,
        });
      });

      it('passes headers to service', () => {
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const headers = { Authorization: 'Bearer token', 'X-Custom': 'value' };
        makeRequest('/api/test', 'GET', undefined, headers);

        expect(mockService.call).toHaveBeenCalledWith({
          endpoint: '/api/test',
          method: 'GET',
          body: undefined,
          headers: { Authorization: 'Bearer token', 'X-Custom': 'value' },
        });
      });

      it('logs API request', () => {
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/v1/payment_intents', 'POST');

        expect(mockLogger.logApiRequest).toHaveBeenCalledWith('POST', '/api/v1/payment_intents');
      });
    });

    describe('successful responses', () => {
      it('parses successful 200 response', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 200,
            text: '{"id":"pi_123","amount":1000}',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest<{ id: string; amount: number }>('/api/test', 'GET');

        expect(result).toEqual({
          success: true,
          data: { id: 'pi_123', amount: 1000 },
          statusCode: 200,
        });
      });

      it('parses successful 201 response', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 201,
            text: '{"id":"new_resource"}',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'POST', { data: 'value' });

        expect(result).toEqual({
          success: true,
          data: { id: 'new_resource' },
          statusCode: 201,
        });
      });

      it('handles 204 No Content response', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 204,
            text: '',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'DELETE');

        expect(result).toEqual({
          success: true,
          data: undefined,
          statusCode: 204,
        });
      });

      it('logs API response on success', () => {
        const mockService = createMockService({
          status: 'OK',
          object: { statusCode: 200, text: '{}' },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'GET');

        expect(mockLogger.logApiResponse).toHaveBeenCalledWith('GET', '/api/test', 200);
      });
    });

    describe('error responses', () => {
      it('handles 400 Bad Request with error details', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 400,
            text: '',
            errorText: '{"code":"INVALID_REQUEST","message":"Invalid amount"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'POST', { amount: -1 });

        expect(result).toEqual({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid amount',
            source: undefined,
          },
          statusCode: 400,
        });
      });

      it('handles 401 Unauthorized', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 401,
            text: '',
            errorText: '{"code":"AUTH_FAILED","message":"Invalid credentials"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Invalid credentials',
            source: undefined,
          },
          statusCode: 401,
        });
      });

      it('handles 404 Not Found', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 404,
            text: '',
            errorText: '{"code":"NOT_FOUND","message":"Resource not found"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test/123', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            source: undefined,
          },
          statusCode: 404,
        });
      });

      it('handles 500 Server Error', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 500,
            text: '',
            errorText: '{"code":"INTERNAL_ERROR","message":"Server error"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Server error',
            source: undefined,
          },
          statusCode: 500,
        });
      });

      it('handles error with source field', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 400,
            text: '',
            errorText: '{"code":"VALIDATION_ERROR","message":"Invalid field","source":"amount"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'POST', {});

        expect(result.error).toEqual({
          code: 'VALIDATION_ERROR',
          message: 'Invalid field',
          source: 'amount',
        });
      });

      it('uses text when errorText is empty', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 400,
            text: '{"code":"ERROR_FROM_TEXT","message":"From text field"}',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'POST', {});

        expect(result.error).toEqual({
          code: 'ERROR_FROM_TEXT',
          message: 'From text field',
          source: undefined,
        });
      });

      it('handles non-JSON error text', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 500,
            text: '',
            errorText: 'Internal Server Error',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_ERROR,
            message: 'Internal Server Error',
          },
          statusCode: 500,
        });
      });

      it('handles empty error response', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 500,
            text: '',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_ERROR,
            message: 'Unknown error',
          },
          statusCode: 500,
        });
      });

      it('logs error on failed request', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 400,
            text: '',
            errorText: '{"code":"ERROR","message":"Bad request"}',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'POST', {});

        expect(mockLogger.error).toHaveBeenCalledWith(
          'API request failed',
          expect.objectContaining({
            endpoint: '/api/test',
            statusCode: 400,
          }),
        );
      });
    });

    describe('parse errors', () => {
      it('handles JSON parse error in success response', () => {
        const mockService = createMockService({
          status: 'OK',
          object: {
            statusCode: 200,
            text: 'invalid json',
            errorText: '',
          },
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_ERROR,
            message: 'Failed to parse API response',
          },
          statusCode: 200,
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to parse API response',
          expect.objectContaining({ endpoint: '/api/test' }),
        );
      });
    });

    describe('service call failures', () => {
      it('handles service ERROR status', () => {
        const mockService = createMockService({
          status: 'ERROR',
          errorMessage: 'Connection timeout',
          object: null,
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Connection timeout',
          },
          statusCode: 0,
        });
      });

      it('handles service failure with no error message', () => {
        const mockService = createMockService({
          status: 'ERROR',
          errorMessage: null,
          object: null,
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Service unavailable',
          },
          statusCode: 0,
        });
      });

      it('logs service call failure', () => {
        const mockService = createMockService({
          status: 'SERVICE_UNAVAILABLE',
          errorMessage: 'Service down',
          object: null,
        });
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'GET');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Service call failed',
          expect.objectContaining({
            endpoint: '/api/test',
            status: 'SERVICE_UNAVAILABLE',
            errorMessage: 'Service down',
          }),
        );
      });
    });

    describe('exception handling', () => {
      it('catches and handles thrown exceptions', () => {
        const mockService = {
          call: jest.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          }),
        };
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result).toEqual({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_ERROR,
            message: 'Unexpected error',
          },
          statusCode: 0,
        });
      });

      it('logs exception', () => {
        const mockService = {
          call: jest.fn().mockImplementation(() => {
            throw new Error('Network error');
          }),
        };
        mockGetAirwallexService.mockReturnValue(mockService);

        makeRequest('/api/test', 'GET');

        expect(mockLogger.error).toHaveBeenCalledWith('API request exception', expect.any(Error));
      });

      it('handles exception with no message', () => {
        const mockService = {
          call: jest.fn().mockImplementation(() => {
            throw new Error();
          }),
        };
        mockGetAirwallexService.mockReturnValue(mockService);

        const result = makeRequest('/api/test', 'GET');

        expect(result.error?.message).toBe('Unknown error');
      });
    });
  });

  describe('get', () => {
    it('makes GET request with endpoint', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 200, text: '{"data":"value"}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      const result = get('/api/resource/123');

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/resource/123',
        method: 'GET',
        body: undefined,
        headers: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('passes headers to GET request', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 200, text: '{}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      get('/api/test', { Authorization: 'Bearer token' });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/test',
        method: 'GET',
        body: undefined,
        headers: { Authorization: 'Bearer token' },
      });
    });
  });

  describe('post', () => {
    it('makes POST request with body', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 201, text: '{"id":"new_123"}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      const result = post('/api/resource', { name: 'test', value: 42 });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/resource',
        method: 'POST',
        body: '{"name":"test","value":42}',
        headers: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'new_123' });
    });

    it('passes headers to POST request', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 201, text: '{}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      post('/api/test', { data: 'value' }, { 'X-Custom': 'header' });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/test',
        method: 'POST',
        body: '{"data":"value"}',
        headers: { 'X-Custom': 'header' },
      });
    });
  });

  describe('put', () => {
    it('makes PUT request with body', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 200, text: '{"updated":true}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      const result = put('/api/resource/123', { name: 'updated' });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/resource/123',
        method: 'PUT',
        body: '{"name":"updated"}',
        headers: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('passes headers to PUT request', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 200, text: '{}' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      put('/api/test', { data: 'value' }, { Authorization: 'Bearer xyz' });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/test',
        method: 'PUT',
        body: '{"data":"value"}',
        headers: { Authorization: 'Bearer xyz' },
      });
    });
  });

  describe('delete', () => {
    it('makes DELETE request', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 204, text: '' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      const result = del('/api/resource/123');

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/resource/123',
        method: 'DELETE',
        body: undefined,
        headers: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('passes headers to DELETE request', () => {
      const mockService = createMockService({
        status: 'OK',
        object: { statusCode: 204, text: '' },
      });
      mockGetAirwallexService.mockReturnValue(mockService);

      del('/api/test', { Authorization: 'Bearer token' });

      expect(mockService.call).toHaveBeenCalledWith({
        endpoint: '/api/test',
        method: 'DELETE',
        body: undefined,
        headers: { Authorization: 'Bearer token' },
      });
    });
  });
});
