/**
 * Application configuration constants
 */

const packageVersion = require('./packageVersion') as string;

export const VERSION = packageVersion;

export const APP_NAME = {
  CARD: 'credit_card',
  APM: 'apm',
  APPLE_PAY: 'applepay',
  GOOGLE_PAY: 'googlepay',
} as const;

export type AppName = (typeof APP_NAME)[keyof typeof APP_NAME];
export type ExpressAppName = typeof APP_NAME.APPLE_PAY | typeof APP_NAME.GOOGLE_PAY;

export const isExpressAppName = (value: unknown): value is ExpressAppName => {
  return value === APP_NAME.APPLE_PAY || value === APP_NAME.GOOGLE_PAY;
};

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
  isExpressAppName,
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
  isExpressAppName,
  getReferrerType,
  PAYMENT_METHOD_AIRWALLEX_ONLINE,
  PAYMENT_PROCESSOR_AIRWALLEX_ONLINE,
  PLATFORM_IDENTIFIER,
  APPLE_PAY_DOMAIN_VERIFICATION_URL,
};
