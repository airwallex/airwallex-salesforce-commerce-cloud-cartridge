jest.mock('../../api/merchantConfig', () => ({
  queryPaymentMethodTypes: jest.fn(),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import PaymentMethodType from '../PaymentMethodType';
import merchantConfigClient from '../../api/merchantConfig';
import logger from '../../../helpers/logger';
import type { PaymentMethodTypeConfig } from '../../api/types';

const mockMerchantConfigClient = merchantConfigClient as jest.Mocked<typeof merchantConfigClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('PaymentMethodType Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockPaymentMethodTypeConfig = (
    overrides: Partial<PaymentMethodTypeConfig> = {},
  ): PaymentMethodTypeConfig => ({
    name: 'card',
    display_name: 'Credit/Debit Card',
    transaction_mode: 'oneoff',
    flows: ['redirect'],
    transaction_currencies: ['USD', 'EUR', 'GBP'],
    country_codes: ['US', 'GB', 'DE'],
    active: true,
    card_schemes: [
      { name: 'visa', display_name: 'Visa' },
      { name: 'mastercard', display_name: 'Mastercard' },
    ],
    ...overrides,
  });

  describe('constructor', () => {
    it('initializes all properties from response data', () => {
      const data = createMockPaymentMethodTypeConfig();

      const paymentMethodType = new PaymentMethodType(data);

      expect(paymentMethodType.name).toBe('card');
      expect(paymentMethodType.displayName).toBe('Credit/Debit Card');
      expect(paymentMethodType.transactionMode).toBe('oneoff');
      expect(paymentMethodType.flows).toEqual(['redirect']);
      expect(paymentMethodType.transactionCurrencies).toEqual(['USD', 'EUR', 'GBP']);
      expect(paymentMethodType.countryCodes).toEqual(['US', 'GB', 'DE']);
      expect(paymentMethodType.active).toBe(true);
      expect(paymentMethodType.cardSchemes).toHaveLength(2);
    });

    it('handles missing optional fields', () => {
      const data = createMockPaymentMethodTypeConfig({
        display_name: undefined,
        card_schemes: undefined,
        resources: undefined,
        surchargeFee_percentage: undefined,
        verification_methods: undefined,
      });

      const paymentMethodType = new PaymentMethodType(data);

      expect(paymentMethodType.displayName).toBeUndefined();
      expect(paymentMethodType.cardSchemes).toBeUndefined();
      expect(paymentMethodType.resources).toBeUndefined();
      expect(paymentMethodType.surchargeFeePercentage).toBeUndefined();
      expect(paymentMethodType.verificationMethods).toBeUndefined();
    });

    it('maps new fields correctly', () => {
      const data = createMockPaymentMethodTypeConfig({
        surchargeFee_percentage: 2.5,
        verification_methods: ['3ds', 'avs'],
      });

      const paymentMethodType = new PaymentMethodType(data);

      expect(paymentMethodType.surchargeFeePercentage).toBe(2.5);
      expect(paymentMethodType.verificationMethods).toEqual(['3ds', 'avs']);
    });

    it('maps card scheme resources correctly', () => {
      const data = createMockPaymentMethodTypeConfig({
        card_schemes: [
          {
            name: 'visa',
            display_name: 'Visa',
            resources: { logos: { default: 'https://example.com/visa.png' } },
          },
        ],
      });

      const paymentMethodType = new PaymentMethodType(data);

      expect(paymentMethodType.cardSchemes?.[0].resources?.logos.default).toBe('https://example.com/visa.png');
    });
  });

  describe('currency and country checks', () => {
    describe('supportsCurrency', () => {
      it('returns true for supported currency', () => {
        const paymentMethodType = new PaymentMethodType(
          createMockPaymentMethodTypeConfig({ transaction_currencies: ['USD', 'EUR'] }),
        );
        expect(paymentMethodType.supportsCurrency('USD')).toBe(true);
        expect(paymentMethodType.supportsCurrency('usd')).toBe(true);
      });

      it('returns false for unsupported currency', () => {
        const paymentMethodType = new PaymentMethodType(
          createMockPaymentMethodTypeConfig({ transaction_currencies: ['USD'] }),
        );
        expect(paymentMethodType.supportsCurrency('CNY')).toBe(false);
      });
    });

    describe('supportsCountry', () => {
      it('returns true for supported country', () => {
        const paymentMethodType = new PaymentMethodType(
          createMockPaymentMethodTypeConfig({ country_codes: ['US', 'GB'] }),
        );
        expect(paymentMethodType.supportsCountry('US')).toBe(true);
        expect(paymentMethodType.supportsCountry('us')).toBe(true);
      });

      it('returns false for unsupported country', () => {
        const paymentMethodType = new PaymentMethodType(createMockPaymentMethodTypeConfig({ country_codes: ['US'] }));
        expect(paymentMethodType.supportsCountry('DE')).toBe(false);
      });

      it('returns true for any country when wildcard is present', () => {
        const paymentMethodType = new PaymentMethodType(createMockPaymentMethodTypeConfig({ country_codes: ['*'] }));
        expect(paymentMethodType.supportsCountry('US')).toBe(true);
        expect(paymentMethodType.supportsCountry('CN')).toBe(true);
        expect(paymentMethodType.supportsCountry('AU')).toBe(true);
      });
    });
  });

  describe('cardSchemeNames', () => {
    it('returns array of card scheme names', () => {
      const paymentMethodType = new PaymentMethodType(
        createMockPaymentMethodTypeConfig({
          card_schemes: [{ name: 'visa' }, { name: 'mastercard' }, { name: 'amex' }],
        }),
      );
      expect(paymentMethodType.cardSchemeNames).toEqual(['visa', 'mastercard', 'amex']);
    });

    it('returns empty array when no card schemes', () => {
      const paymentMethodType = new PaymentMethodType(createMockPaymentMethodTypeConfig({ card_schemes: undefined }));
      expect(paymentMethodType.cardSchemeNames).toEqual([]);
    });
  });

  describe('static query', () => {
    it('returns array of PaymentMethodType on success', () => {
      const responseData = {
        has_more: false,
        items: [
          createMockPaymentMethodTypeConfig({ name: 'card' }),
          createMockPaymentMethodTypeConfig({ name: 'wechatpay', card_schemes: undefined }),
        ],
      };
      mockMerchantConfigClient.queryPaymentMethodTypes.mockReturnValue({
        success: true,
        data: responseData,
        statusCode: 200,
      });

      const result = PaymentMethodType.query({ transaction_currency: 'USD' });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBeInstanceOf(PaymentMethodType);
      expect(result![0].name).toBe('card');
      expect(result![1].name).toBe('wechatpay');
    });

    it('logs success info', () => {
      mockMerchantConfigClient.queryPaymentMethodTypes.mockReturnValue({
        success: true,
        data: { has_more: false, items: [createMockPaymentMethodTypeConfig()] },
        statusCode: 200,
      });

      PaymentMethodType.query();

      expect(mockLogger.info).toHaveBeenCalledWith('Payment method types queried', {
        count: 1,
        hasMore: false,
      });
    });

    it('returns null on API error', () => {
      mockMerchantConfigClient.queryPaymentMethodTypes.mockReturnValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        statusCode: 401,
      });

      const result = PaymentMethodType.query();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to query payment method types', {
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    });

    it('passes query params to client', () => {
      mockMerchantConfigClient.queryPaymentMethodTypes.mockReturnValue({
        success: true,
        data: { has_more: false, items: [] },
        statusCode: 200,
      });

      PaymentMethodType.query({
        transaction_currency: 'EUR',
        country_code: 'DE',
        transaction_mode: 'recurring',
        resources_needed: true,
      });

      expect(mockMerchantConfigClient.queryPaymentMethodTypes).toHaveBeenCalledWith({
        transaction_currency: 'EUR',
        country_code: 'DE',
        transaction_mode: 'recurring',
        resources_needed: true,
      });
    });
  });

  describe('static fromResponse', () => {
    it('creates PaymentMethodType instance from response data', () => {
      const data = createMockPaymentMethodTypeConfig({ name: 'alipaycn', display_name: 'Alipay' });

      const paymentMethodType = PaymentMethodType.fromResponse(data);

      expect(paymentMethodType).toBeInstanceOf(PaymentMethodType);
      expect(paymentMethodType.name).toBe('alipaycn');
      expect(paymentMethodType.displayName).toBe('Alipay');
    });
  });
});
