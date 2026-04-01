/**
 * Unit tests for AirwallexService
 */

import airwallexService from '../airwallexService';

const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

const { getBaseUrl, createAirwallexService, getAirwallexService, clearServiceCache, SERVICE_ID } = airwallexService;

// Mock HTTPService class
class MockHTTPService {
  url = '';
  method = '';
  headers: Record<string, string> = {};

  setURL(url: string) {
    this.url = url;
  }
  setRequestMethod(method: string) {
    this.method = method;
  }
  addHeader(key: string, value: string) {
    this.headers[key] = value;
  }
}

// Mock HTTPClient class
class MockHTTPClient {
  statusCode: number;
  text: string;
  errorText: string;

  constructor(options: { statusCode?: number; text?: string; errorText?: string } = {}) {
    this.statusCode = options.statusCode || 200;
    this.text = options.text || '';
    this.errorText = options.errorText || '';
  }
}

// Factory functions
const createMockHTTPService = () => new MockHTTPService();
const createMockHTTPClient = (options?: { statusCode?: number; text?: string; errorText?: string }) =>
  new MockHTTPClient(options);

// Get mock helpers from LocalServiceRegistry
const mockRegistry = LocalServiceRegistry as {
  createService: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _getLastCallbacks: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _getMockService: () => any;
  _reset: () => void;
};

describe('AirwallexService', () => {
  beforeEach(() => {
    // Clear service cache and reset mocks before each test
    clearServiceCache();
    jest.clearAllMocks();
    mockRegistry._reset();
  });

  describe('getBaseUrl', () => {
    it('returns demo URL for demo environment', () => {
      const url = getBaseUrl('demo');
      expect(url).toBe('https://api-demo.airwallex.com');
    });

    it('returns production URL for production environment', () => {
      const url = getBaseUrl('production');
      expect(url).toBe('https://api.airwallex.com');
    });

    it('falls back to demo URL for invalid environment', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = getBaseUrl('invalid' as any);
      expect(url).toBe('https://api-demo.airwallex.com');
    });
  });

  describe('createAirwallexService', () => {
    it('calls LocalServiceRegistry.createService with correct SERVICE_ID', () => {
      createAirwallexService('demo');

      expect(LocalServiceRegistry.createService).toHaveBeenCalledWith(SERVICE_ID, expect.any(Object));
    });

    describe('createRequest callback', () => {
      it('sets URL correctly with base URL and endpoint', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'GET' as const,
        };

        callbacks.createRequest(mockSvc, request);

        expect(mockSvc.url).toBe('https://api-demo.airwallex.com/api/v1/test');
      });

      it('sets request method', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'POST' as const,
        };

        callbacks.createRequest(mockSvc, request);

        expect(mockSvc.method).toBe('POST');
      });

      it('adds Content-Type header by default', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'GET' as const,
        };

        callbacks.createRequest(mockSvc, request);

        expect(mockSvc.headers['Content-Type']).toBe('application/json');
      });

      it('adds custom headers', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'GET' as const,
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          },
        };

        callbacks.createRequest(mockSvc, request);

        expect(mockSvc.headers['Authorization']).toBe('Bearer token123');
        expect(mockSvc.headers['X-Custom-Header']).toBe('custom-value');
      });

      it('returns body string when provided', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'POST' as const,
          body: '{"key": "value"}',
        };

        const result = callbacks.createRequest(mockSvc, request);

        expect(result).toBe('{"key": "value"}');
      });

      it('returns empty string when body not provided', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();

        const request = {
          endpoint: '/api/v1/test',
          method: 'GET' as const,
        };

        const result = callbacks.createRequest(mockSvc, request);

        expect(result).toBe('');
      });
    });

    describe('parseResponse callback', () => {
      it('extracts statusCode, text, and errorText from client', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();
        const mockClient = createMockHTTPClient({
          statusCode: 201,
          text: '{"id": "123"}',
          errorText: '',
        });

        const response = callbacks.parseResponse(mockSvc, mockClient);

        expect(response).toEqual({
          statusCode: 201,
          text: '{"id": "123"}',
          errorText: '',
        });
      });

      it('handles error response', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();
        const mockSvc = createMockHTTPService();
        const mockClient = createMockHTTPClient({
          statusCode: 400,
          text: '',
          errorText: '{"error": "Bad Request"}',
        });

        const response = callbacks.parseResponse(mockSvc, mockClient);

        expect(response).toEqual({
          statusCode: 400,
          text: '',
          errorText: '{"error": "Bad Request"}',
        });
      });
    });

    describe('filterLogMessage callback', () => {
      it('filters token values', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const msg = '{"token": "secret-token-123"}';
        const filtered = callbacks.filterLogMessage(msg);

        expect(filtered).toBe('{"token": "[FILTERED]"}');
      });

      it('filters x-api-key values', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const msg = '{"x-api-key": "my-api-key-456"}';
        const filtered = callbacks.filterLogMessage(msg);

        expect(filtered).toBe('{"x-api-key": "[FILTERED]"}');
      });

      it('filters client_secret values', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const msg = '{"client_secret": "secret-value"}';
        const filtered = callbacks.filterLogMessage(msg);

        expect(filtered).toBe('{"client_secret": "[FILTERED]"}');
      });

      it('filters api_key values', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const msg = '{"api_key": "api-key-value"}';
        const filtered = callbacks.filterLogMessage(msg);

        expect(filtered).toBe('{"api_key": "[FILTERED]"}');
      });

      it('filters multiple sensitive values', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const msg = '{"token": "abc", "api_key": "xyz", "other": "safe"}';
        const filtered = callbacks.filterLogMessage(msg);

        expect(filtered).toBe('{"token": "[FILTERED]", "api_key": "[FILTERED]", "other": "safe"}');
      });
    });

    describe('getRequestLogMessage callback', () => {
      it('returns method and endpoint', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const request = {
          method: 'POST',
          endpoint: '/api/v1/payment_intents/create',
        };
        const msg = callbacks.getRequestLogMessage(request);

        expect(msg).toBe('POST /api/v1/payment_intents/create');
      });
    });

    describe('getResponseLogMessage callback', () => {
      it('returns status code', () => {
        createAirwallexService('demo');
        const callbacks = mockRegistry._getLastCallbacks();

        const response = {
          statusCode: 200,
          text: '{}',
          errorText: '',
        };
        const msg = callbacks.getResponseLogMessage(response);

        expect(msg).toBe('Status: 200');
      });
    });
  });

  describe('getAirwallexService', () => {
    it('creates new service instance on first call', () => {
      getAirwallexService('demo');

      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(1);
    });

    it('returns cached instance on subsequent calls with same environment', () => {
      const service1 = getAirwallexService('demo');
      const service2 = getAirwallexService('demo');

      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
    });

    it('creates new instance when environment changes', () => {
      getAirwallexService('demo');
      getAirwallexService('production');

      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(2);
    });

    it('uses correct base URL for each environment', () => {
      createAirwallexService('demo');
      let callbacks = mockRegistry._getLastCallbacks();
      let mockSvc = createMockHTTPService();
      callbacks.createRequest(mockSvc, { endpoint: '/test', method: 'GET' });
      expect(mockSvc.url).toBe('https://api-demo.airwallex.com/test');

      createAirwallexService('production');
      callbacks = mockRegistry._getLastCallbacks();
      mockSvc = createMockHTTPService();
      callbacks.createRequest(mockSvc, { endpoint: '/test', method: 'GET' });
      expect(mockSvc.url).toBe('https://api.airwallex.com/test');
    });
  });

  describe('clearServiceCache', () => {
    it('clears cached service instance', () => {
      getAirwallexService('demo');
      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(1);

      clearServiceCache();

      getAirwallexService('demo');
      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(2);
    });

    it('allows switching environments after cache clear', () => {
      getAirwallexService('demo');
      clearServiceCache();
      getAirwallexService('production');

      expect(LocalServiceRegistry.createService).toHaveBeenCalledTimes(2);
    });
  });

  describe('SERVICE_ID', () => {
    it('has correct value', () => {
      expect(SERVICE_ID).toBe('AirwallexPublicAPI');
    });
  });
});
