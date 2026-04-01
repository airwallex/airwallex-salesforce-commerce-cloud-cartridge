jest.mock('../baseClient', () => ({
  get: jest.fn(),
}));

jest.mock('../apiHelper', () => {
  const actual = jest.requireActual('../apiHelper');
  return {
    ...actual,
    authenticatedRequest: jest.fn(fn =>
      fn({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
    ),
  };
});

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import merchantConfigClient from '../merchantConfig';
import baseClient from '../baseClient';
import { authenticatedRequest } from '../apiHelper';
import logger from '../../../helpers/logger';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const mockBaseClient = baseClient as jest.Mocked<typeof baseClient>;
const mockAuthenticatedRequest = authenticatedRequest as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('MerchantConfig Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedRequest.mockImplementation(fn =>
      fn({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    );
  });

  describe('queryPaymentMethodTypes', () => {
    const successResponse = {
      has_more: false,
      items: [
        {
          name: 'card',
          display_name: 'Card',
          transaction_mode: 'oneoff',
          flows: ['redirect'],
          transaction_currencies: ['USD', 'EUR'],
          country_codes: ['US', 'GB'],
          active: true,
          card_schemes: [{ name: 'visa', display_name: 'Visa' }],
        },
        {
          name: 'wechatpay',
          display_name: 'WeChat Pay',
          transaction_mode: 'oneoff',
          flows: ['qrcode', 'mobile_web'],
          transaction_currencies: ['CNY', 'USD'],
          country_codes: ['CN'],
          active: true,
        },
      ],
    };

    it('queries payment method types with no params', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = merchantConfigClient.queryPaymentMethodTypes();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(successResponse);
      expect(mockBaseClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.PAYMENT_METHOD_TYPES,
        expect.objectContaining({ Authorization: 'Bearer test-token' }),
      );
    });

    it('queries payment method types with all params', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      const result = merchantConfigClient.queryPaymentMethodTypes({
        transaction_currency: 'USD',
        country_code: 'US',
        transaction_mode: 'oneoff',
        active: true,
        resources_needed: true,
        page_num: 0,
        page_size: 50,
      });

      expect(result.success).toBe(true);
      const calledUrl = mockBaseClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('transaction_currency=USD');
      expect(calledUrl).toContain('country_code=US');
      expect(calledUrl).toContain('transaction_mode=oneoff');
      expect(calledUrl).toContain('active=true');
      expect(calledUrl).toContain('__resources=true');
      expect(calledUrl).toContain('page_num=0');
      expect(calledUrl).toContain('page_size=50');
    });

    it('maps resources_needed to __resources query param', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      merchantConfigClient.queryPaymentMethodTypes({
        resources_needed: true,
      });

      const calledUrl = mockBaseClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('__resources=true');
      expect(calledUrl).not.toContain('resources_needed');
    });

    it('handles paginated response with has_more true', () => {
      const paginatedResponse = {
        has_more: true,
        items: [
          {
            name: 'card',
            transaction_mode: 'oneoff',
            flows: [],
            transaction_currencies: [],
            country_codes: [],
            active: true,
          },
        ],
      };

      mockBaseClient.get.mockReturnValue({
        success: true,
        data: paginatedResponse,
        statusCode: 200,
      });

      const result = merchantConfigClient.queryPaymentMethodTypes({ page_num: 0, page_size: 1 });

      expect(result.success).toBe(true);
      expect(result.data?.has_more).toBe(true);
    });

    it('handles API error response', () => {
      mockBaseClient.get.mockReturnValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        statusCode: 401,
      });

      const result = merchantConfigClient.queryPaymentMethodTypes();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.statusCode).toBe(401);
    });

    it('logs query request info', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      merchantConfigClient.queryPaymentMethodTypes({
        transaction_currency: 'EUR',
        country_code: 'DE',
        transaction_mode: 'recurring',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Querying payment method types', {
        transactionCurrency: 'EUR',
        countryCode: 'DE',
        transactionMode: 'recurring',
      });
    });

    it('builds correct URL with partial params', () => {
      mockBaseClient.get.mockReturnValue({
        success: true,
        data: successResponse,
        statusCode: 200,
      });

      merchantConfigClient.queryPaymentMethodTypes({
        transaction_currency: 'GBP',
        active: false,
      });

      const calledUrl = mockBaseClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('transaction_currency=GBP');
      expect(calledUrl).toContain('active=false');
      expect(calledUrl).not.toContain('country_code=');
      expect(calledUrl).not.toContain('transaction_mode=');
    });
  });
});
