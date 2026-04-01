/**
 * Configuration helper for reading SFCC site preferences
 */

import Site = require('dw/system/Site');
import URLUtils = require('dw/web/URLUtils');
import { Environment } from '../constants/apiEndpoints';

/**
 * Map of custom preference keys to their types
 */
export type CustomPreferenceMap = {
  awx_v1_environment: Environment;
  awx_v1_client_id_demo: string;
  awx_v1_client_id_production: string;
  awx_v1_api_key_demo: string;
  awx_v1_api_key_production: string;
  awx_v1_webhook_secret_demo: string;
  awx_v1_webhook_secret_production: string;
  awx_v1_card_scheme_demo: string;
  awx_v1_card_scheme_production: string;
  awx_v1_express_checkout_demo: string;
  awx_v1_express_checkout_production: string;
  awx_v1_all_payment_methods_demo: string;
  awx_v1_all_payment_methods_production: string;
  awx_v1_auto_capture_demo: boolean;
  awx_v1_auto_capture_production: boolean;
};

export type CustomPreferenceKey = keyof CustomPreferenceMap;

export type CustomPreferenceItem = {
  key: CustomPreferenceKey;
  value: CustomPreferenceMap[CustomPreferenceKey];
};

const currentSite = Site.getCurrent();

const getCustomPreference = <T extends keyof CustomPreferenceMap>(
  field: T,
  fallback?: CustomPreferenceMap[T],
): CustomPreferenceMap[T] | undefined => {
  if (!currentSite) {
    return;
  }
  const value = currentSite.getCustomPreferenceValue(field);
  return value ?? fallback;
};

const setCustomPreference = <T extends keyof CustomPreferenceMap>(field: T, value: CustomPreferenceMap[T]) => {
  if (!currentSite) {
    return;
  }
  currentSite.setCustomPreferenceValue(field, value);
};

const airwallexConfig = {
  getCustomPreference: <T extends keyof CustomPreferenceMap>(field: T) => getCustomPreference(field),
  setCustomPreference: <T extends keyof CustomPreferenceMap>(field: T, value: CustomPreferenceMap[T]) =>
    setCustomPreference(field, value),
  getEnvironment: () =>
    getCustomPreference('awx_v1_environment') &&
    (`${getCustomPreference('awx_v1_environment')}` as Environment | undefined),
  setEnvironment: (environment: 'demo' | 'production') =>
    setCustomPreference('awx_v1_environment', environment),

  getClientId: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_client_id_${env}`);
  },

  getApiKey: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_api_key_${env}`);
  },

  getWebhookSecret: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_webhook_secret_${env}`);
  },

  setClientId: (clientId: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_client_id_${env}`, clientId);
  },

  setApiKey: (apiKey: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_api_key_${env}`, apiKey);
  },

  setWebhookSecret: (webhookSecret: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_webhook_secret_${env}`, webhookSecret);
  },

  getCardScheme: (env = getCustomPreference('awx_v1_environment')): string => {
    if (!env) return '';
    return getCustomPreference(`awx_v1_card_scheme_${env}`) ?? '';
  },

  getExpressCheckout: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_express_checkout_${env}`);
  },

  getEnabledPaymentMethods: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_all_payment_methods_${env}`);
  },

  setCardScheme: (value: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_card_scheme_${env}`, value);
  },

  setExpressCheckout: (value: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_express_checkout_${env}`, value);
  },

  setEnabledPaymentMethods: (value: string, env = getCustomPreference('awx_v1_environment')): void => {
    if (!env) return;
    setCustomPreference(`awx_v1_all_payment_methods_${env}`, value);
  },

  isEnabled: (): boolean => {
    const env = getCustomPreference('awx_v1_environment');
    return !!env;
  },

  getPaymentMethods: (env = getCustomPreference('awx_v1_environment')): string | undefined => {
    if (!env) return undefined;
    return getCustomPreference(`awx_v1_all_payment_methods_${env}`);
  },

  getAutoCapture: (env = getCustomPreference('awx_v1_environment')) => {
    if (!env) return true;
    return getCustomPreference(`awx_v1_auto_capture_${env}`) ?? true;
  },

  getApplePayEnabled: (env = getCustomPreference('awx_v1_environment')): boolean => {
    if (!env) return false;
    const expressCheckout = getCustomPreference(`awx_v1_express_checkout_${env}`) ?? '';
    const methods = expressCheckout.split(',').map(m => m.trim().toLowerCase());
    return methods.includes('applepay');
  },

  getGooglePayEnabled: (env = getCustomPreference('awx_v1_environment')): boolean => {
    if (!env) return false;
    const expressCheckout = getCustomPreference(`awx_v1_express_checkout_${env}`) ?? '';
    const methods = expressCheckout.split(',').map(m => m.trim().toLowerCase());
    return methods.includes('googlepay');
  },

  getSDKUrl: (): string => {
    const env = `${getCustomPreference('awx_v1_environment')}`;
    if (env === 'demo') return 'https://static-demo.airwallex.com/components/sdk/v1/index.js';
    if (env === 'production') return 'https://static.airwallex.com/components/sdk/v1/index.js';
    return '';
  },

  getWebhookUrl: (): string => {
    if (!currentSite) {
      return URLUtils.https('AirwallexWebhook-Notify').toString();
    }
    // Use storefront host from site preferences (not BM domain) when called from Business Manager
    const host = currentSite.httpsHostName || currentSite.httpHostName;
    if (!host) {
      return URLUtils.https('AirwallexWebhook-Notify').toString();
    }
    const siteId = currentSite.ID;
    const path = `/on/demandware.store/Sites-${siteId}-Site/default/AirwallexWebhook-Notify`;
    return `https://${host}${path}`;
  },
};

// Named exports for convenient imports
export const getEnvironment = airwallexConfig.getEnvironment;
export const setEnvironment = airwallexConfig.setEnvironment;
export const getClientId = airwallexConfig.getClientId;
export const getApiKey = airwallexConfig.getApiKey;
export const getWebhookSecret = airwallexConfig.getWebhookSecret;
export const setClientId = airwallexConfig.setClientId;
export const setApiKey = airwallexConfig.setApiKey;
export const setWebhookSecret = airwallexConfig.setWebhookSecret;
export const getCardScheme = airwallexConfig.getCardScheme;
export const getExpressCheckout = airwallexConfig.getExpressCheckout;
export const getEnabledPaymentMethods = airwallexConfig.getEnabledPaymentMethods;
export const setCardScheme = airwallexConfig.setCardScheme;
export const setExpressCheckout = airwallexConfig.setExpressCheckout;
export const setEnabledPaymentMethods = airwallexConfig.setEnabledPaymentMethods;
export const isEnabled = airwallexConfig.isEnabled;
export const getAutoCapture = airwallexConfig.getAutoCapture;
export const getApplePayEnabled = airwallexConfig.getApplePayEnabled;
export const getGooglePayEnabled = airwallexConfig.getGooglePayEnabled;
export const getPaymentMethods = airwallexConfig.getPaymentMethods;
export const getSDKUrl = airwallexConfig.getSDKUrl;
export const getWebhookUrl = airwallexConfig.getWebhookUrl;

module.exports = airwallexConfig;

export default airwallexConfig;
