/**
 * ApplePayDomains domain model
 */

import applePayClient from '../api/applePay';
import logger from '../../helpers/logger';
import type { ApplePayRegisteredDomainsResponse } from '../api/types';

/**
 * ApplePayDomains domain class
 * Manages Apple Pay domain registration
 */
class ApplePayDomains {
  readonly domains: string[];

  constructor(data: ApplePayRegisteredDomainsResponse) {
    this.domains = data.items;
  }

  // =========================================================================
  // Domain Checks
  // =========================================================================

  /**
   * Check if a specific domain is registered
   */
  hasDomain(domain: string): boolean {
    return this.domains.some(d => d.toLowerCase() === domain.toLowerCase());
  }

  // =========================================================================
  // Static Factory Methods
  // =========================================================================

  /**
   * List all registered Apple Pay domains
   */
  static list(): ApplePayDomains | null {
    const response = applePayClient.listDomains();

    if (response.success && response.data) {
      logger.info('Apple Pay domains listed', {
        count: response.data.items.length,
      });
      return new ApplePayDomains(response.data);
    }

    logger.error('Failed to list Apple Pay domains', {
      error: response.error,
    });
    return null;
  }

  /**
   * Register domains for Apple Pay
   */
  static register(domains: string[]): ApplePayDomains | null {
    if (domains.length === 0) {
      logger.warn('No domains provided for registration');
      return null;
    }

    const response = applePayClient.registerDomains({ items: domains });

    if (response.success && response.data) {
      logger.info('Apple Pay domains registered', {
        requestedCount: domains.length,
        totalCount: response.data.items.length,
      });
      return new ApplePayDomains(response.data);
    }

    logger.error('Failed to register Apple Pay domains', {
      domains,
      error: response.error,
    });
    return null;
  }

  /**
   * Create an ApplePayDomains instance from API response data
   */
  static fromResponse(data: ApplePayRegisteredDomainsResponse): ApplePayDomains {
    return new ApplePayDomains(data);
  }
}

module.exports = ApplePayDomains;
export default ApplePayDomains;
