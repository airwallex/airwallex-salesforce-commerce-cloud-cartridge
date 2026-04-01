jest.mock('../../api/applePay', () => ({
  listDomains: jest.fn(),
  registerDomains: jest.fn(),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import ApplePayDomains from '../ApplePayDomains';
import applePayClient from '../../api/applePay';
import logger from '../../../helpers/logger';
import type { ApplePayRegisteredDomainsResponse } from '../../api/types';

const mockApplePayClient = applePayClient as jest.Mocked<typeof applePayClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('ApplePayDomains Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockResponse = (domains: string[] = []): ApplePayRegisteredDomainsResponse => ({
    items: domains,
  });

  describe('constructor', () => {
    it('initializes domains from response data', () => {
      const data = createMockResponse(['example.com', 'shop.example.com']);

      const applePayDomains = new ApplePayDomains(data);

      expect(applePayDomains.domains).toEqual(['example.com', 'shop.example.com']);
    });

    it('handles empty domain list', () => {
      const data = createMockResponse([]);

      const applePayDomains = new ApplePayDomains(data);

      expect(applePayDomains.domains).toEqual([]);
    });
  });

  describe('hasDomain', () => {
    it('returns true when domain is registered', () => {
      const applePayDomains = new ApplePayDomains(createMockResponse(['example.com', 'shop.com']));

      expect(applePayDomains.hasDomain('example.com')).toBe(true);
    });

    it('returns true for case-insensitive match', () => {
      const applePayDomains = new ApplePayDomains(createMockResponse(['Example.COM']));

      expect(applePayDomains.hasDomain('example.com')).toBe(true);
      expect(applePayDomains.hasDomain('EXAMPLE.COM')).toBe(true);
    });

    it('returns false when domain is not registered', () => {
      const applePayDomains = new ApplePayDomains(createMockResponse(['example.com']));

      expect(applePayDomains.hasDomain('other.com')).toBe(false);
    });
  });

  describe('static list', () => {
    it('returns ApplePayDomains on success', () => {
      mockApplePayClient.listDomains.mockReturnValue({
        success: true,
        data: createMockResponse(['domain1.com', 'domain2.com']),
        statusCode: 200,
      });

      const result = ApplePayDomains.list();

      expect(result).not.toBeNull();
      expect(result?.domains).toEqual(['domain1.com', 'domain2.com']);
      expect(mockApplePayClient.listDomains).toHaveBeenCalled();
    });

    it('logs success info', () => {
      mockApplePayClient.listDomains.mockReturnValue({
        success: true,
        data: createMockResponse(['domain.com']),
        statusCode: 200,
      });

      ApplePayDomains.list();

      expect(mockLogger.info).toHaveBeenCalledWith('Apple Pay domains listed', {
        count: 1,
      });
    });

    it('returns null on API error', () => {
      mockApplePayClient.listDomains.mockReturnValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        statusCode: 401,
      });

      const result = ApplePayDomains.list();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list Apple Pay domains', {
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      });
    });
  });

  describe('static register', () => {
    it('returns ApplePayDomains on success', () => {
      mockApplePayClient.registerDomains.mockReturnValue({
        success: true,
        data: createMockResponse(['existing.com', 'new1.com', 'new2.com']),
        statusCode: 200,
      });

      const result = ApplePayDomains.register(['new1.com', 'new2.com']);

      expect(result).not.toBeNull();
      expect(result?.domains).toEqual(['existing.com', 'new1.com', 'new2.com']);
      expect(mockApplePayClient.registerDomains).toHaveBeenCalledWith({
        items: ['new1.com', 'new2.com'],
      });
    });

    it('logs success info with counts', () => {
      mockApplePayClient.registerDomains.mockReturnValue({
        success: true,
        data: createMockResponse(['domain1.com', 'domain2.com', 'domain3.com']),
        statusCode: 200,
      });

      ApplePayDomains.register(['domain2.com', 'domain3.com']);

      expect(mockLogger.info).toHaveBeenCalledWith('Apple Pay domains registered', {
        requestedCount: 2,
        totalCount: 3,
      });
    });

    it('returns null on API error', () => {
      mockApplePayClient.registerDomains.mockReturnValue({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid domain' },
        statusCode: 400,
      });

      const result = ApplePayDomains.register(['invalid domain']);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to register Apple Pay domains', {
        domains: ['invalid domain'],
        error: { code: 'VALIDATION_ERROR', message: 'Invalid domain' },
      });
    });

    it('returns null and logs warning for empty domain list', () => {
      const result = ApplePayDomains.register([]);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('No domains provided for registration');
      expect(mockApplePayClient.registerDomains).not.toHaveBeenCalled();
    });
  });

  describe('static fromResponse', () => {
    it('creates ApplePayDomains instance from response data', () => {
      const data = createMockResponse(['domain1.com', 'domain2.com']);

      const applePayDomains = ApplePayDomains.fromResponse(data);

      expect(applePayDomains).toBeInstanceOf(ApplePayDomains);
      expect(applePayDomains.domains).toEqual(['domain1.com', 'domain2.com']);
    });
  });
});
