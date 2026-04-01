/**
 * Application configuration constants
 */

export const VERSION = '1.0.0';

export const APP_NAME = {
  CARD: 'credit_card',
  APM: 'apm',
} as const;

export type AppName = (typeof APP_NAME)[keyof typeof APP_NAME];

export const getReferrerType = (appName: AppName): string => {
  return `salesforce_${appName}`;
};

// used for SFCC
export const PAYMENT_METHOD_ID = {
  CARD: 'AirwallexCreditCard',
  APM: 'AirwallexOnline',
} as const;

// SFCC built-in configurations
const PAYMENT_METHOD_AIRWALLEX_ONLINE = 'AirwallexOnline';

const PAYMENT_PROCESSOR_AIRWALLEX_ONLINE = 'AIRWALLEX_ONLINE';

export const PLATFORM_IDENTIFIER = 'salesforce';

export const APPLE_PAY_DOMAIN_VERIFICATION_URL = '/.well-known/apple-developer-merchantid-domain-association';

module.exports = {
  VERSION: VERSION,
  APP_NAME,
  getReferrerType,
  PAYMENT_METHOD_AIRWALLEX_ONLINE,
  PAYMENT_PROCESSOR_AIRWALLEX_ONLINE,
  PAYMENT_METHOD_ID,
  PLATFORM_IDENTIFIER,
  APPLE_PAY_DOMAIN_VERIFICATION_URL,
};

export default {
  VERSION: VERSION,
  APP_NAME,
  getReferrerType,
  PAYMENT_METHOD_AIRWALLEX_ONLINE,
  PAYMENT_PROCESSOR_AIRWALLEX_ONLINE,
  PLATFORM_IDENTIFIER,
  APPLE_PAY_DOMAIN_VERIFICATION_URL,
};
