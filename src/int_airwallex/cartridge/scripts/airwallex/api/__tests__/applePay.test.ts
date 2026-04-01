jest.mock('../baseClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../apiHelper', () => ({
  authenticatedRequest: jest.fn(fn => fn({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' })),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import applePayClient from '../applePay';
import baseClient from '../baseClient';
import { authenticatedRequest } from '../apiHelper';
import logger from '../../../helpers/logger';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const mockBaseClient = baseClient as jest.Mocked<typeof baseClient>;
const mockAuthenticatedRequest = authenticatedRequest as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('ApplePay Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedRequest.mockImplementation(fn =>
      fn({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    );
  });

  describe('registerDomains', () => {
    const successResponse = {
      items: ['example.com', 'shop.example.com', 'checkout.example.com'],
    };

    it('registers domains successfully', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = applePayClient.registerDomains({
        items: ['example.com', 'shop.example.com'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.APPLEPAY_DOMAINS_ADD,
        { items: ['example.com', 'shop.example.com'] },
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('logs registration info', () => {
      mockBaseClient.post.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      applePayClient.registerDomains({
        items: ['domain1.com', 'domain2.com', 'domain3.com'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Registering Apple Pay domains', {
        domainCount: 3,
      });
    });

    it('handles API error response', () => {
      mockBaseClient.post.mockReturnValue({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid domain format' },
        statusCode: 400,
      });

      const result = applePayClient.registerDomains({
        items: ['invalid domain'],
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('listDomains', () => {
    it('lists registered domains', () => {
      const successResponse = {
        items: ['domain1.com', 'domain2.com'],
      };

      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = applePayClient.listDomains();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.APPLEPAY_DOMAINS_LIST,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('handles empty domain list', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: { items: [] },
        statusCode: 200,
      });

      const result = applePayClient.listDomains();

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual([]);
    });

    it('logs list request', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: { items: [] },
        statusCode: 200,
      });

      applePayClient.listDomains();

      expect(mockLogger.info).toHaveBeenCalledWith('Listing Apple Pay domains');
    });

    it('handles API error response', () => {
      mockBaseClient.get.mockReturnValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        statusCode: 401,
      });

      const result = applePayClient.listDomains();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.statusCode).toBe(401);
    });
  });
});
