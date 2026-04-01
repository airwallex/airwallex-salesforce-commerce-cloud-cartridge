/**
 * Registry for payment method resources (display names and logo URLs).
 * Populated by registerResources when GetPaymentMethodTypes API returns.
 */

import { getPaymentIconAssetName } from './paymentIconMap';

export interface PaymentMethodResourceInfo {
  displayName: string;
  logoUrl: string;
}

const registry: Record<string, PaymentMethodResourceInfo> = {};

/**
 * Registers payment method resources. Skips methods that are already registered.
 */
export function registerResources(resources: Record<string, PaymentMethodResourceInfo>): void {
  for (const [key, info] of Object.entries(resources)) {
    const normalizedKey = getPaymentIconAssetName(key);
    if (!registry[normalizedKey] && info.displayName) {
      registry[normalizedKey] = info;
    }
  }
}

/**
 * Gets the registered display name for a payment method.
 */
export function getRegisteredDisplayName(name: string): string | undefined {
  const key = getPaymentIconAssetName(name);
  return registry[key]?.displayName;
}

/**
 * Gets the registered logo URL for a payment method.
 */
export function getRegisteredLogoUrl(name: string): string | undefined {
  const key = getPaymentIconAssetName(name);
  return registry[key]?.logoUrl;
}
