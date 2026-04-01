/**
 * PaymentMethodType domain model
 */

import merchantConfigClient from '../api/merchantConfig';
import logger from '../../helpers/logger';
import type {
  PaymentMethodTypeConfig,
  CardScheme,
  PaymentMethodResource,
  QueryPaymentMethodTypesRequest,
} from '../api/types';

/**
 * PaymentMethodType domain class
 * Represents a payment method type configuration from Airwallex
 */
class PaymentMethodType {
  readonly name: string;
  readonly displayName?: string;
  readonly transactionMode: string;
  readonly flows: string[];
  readonly transactionCurrencies: string[];
  readonly countryCodes: string[];
  readonly active: boolean;
  readonly cardSchemes?: CardScheme[];
  readonly resources?: PaymentMethodResource;
  readonly surchargeFeePercentage?: number;
  readonly verificationMethods?: string[];

  constructor(data: PaymentMethodTypeConfig) {
    this.name = data.name;
    this.displayName = data.display_name;
    this.transactionMode = data.transaction_mode;
    this.flows = data.flows;
    this.transactionCurrencies = data.transaction_currencies;
    this.countryCodes = data.country_codes;
    this.active = data.active;
    this.cardSchemes = data.card_schemes;
    this.resources = data.resources;
    this.surchargeFeePercentage = data.surchargeFee_percentage;
    this.verificationMethods = data.verification_methods;
  }

  // =========================================================================
  // Currency & Country Checks
  // =========================================================================

  /**
   * Check if this payment method supports a specific currency
   */
  supportsCurrency(currency: string): boolean {
    return this.transactionCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Check if this payment method supports a specific country
   */
  supportsCountry(countryCode: string): boolean {
    if (this.countryCodes.includes('*')) {
      return true;
    }
    return this.countryCodes.includes(countryCode.toUpperCase());
  }

  /**
   * Get all supported card scheme names
   */
  get cardSchemeNames(): string[] {
    if (!this.cardSchemes) {
      return [];
    }
    return this.cardSchemes.map(scheme => scheme.name);
  }

  // =========================================================================
  // Static Factory Methods
  // =========================================================================

  /**
   * Query available payment method types
   */
  static query(params: QueryPaymentMethodTypesRequest = {}): PaymentMethodType[] | null {
    const response = merchantConfigClient.queryPaymentMethodTypes(params);

    if (response.success && response.data) {
      logger.info('Payment method types queried', {
        count: response.data.items.length,
        hasMore: response.data.has_more,
      });
      return response.data.items.map(item => new PaymentMethodType(item));
    }

    logger.error('Failed to query payment method types', {
      error: response.error,
    });
    return null;
  }

  /**
   * Create a PaymentMethodType from API response data
   */
  static fromResponse(data: PaymentMethodTypeConfig): PaymentMethodType {
    return new PaymentMethodType(data);
  }
}

module.exports = PaymentMethodType;
export default PaymentMethodType;
