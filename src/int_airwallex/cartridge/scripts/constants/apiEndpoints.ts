/**
 * Airwallex API endpoints by environment
 */

export const ENVIRONMENTS = {
  demo: {
    apiUrl: 'https://api-demo.airwallex.com',
  },
  production: {
    apiUrl: 'https://api.airwallex.com',
  },
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: '/api/v1/authentication/login',

  // Payment Intents
  PAYMENT_INTENTS_CREATE: '/api/v1/pa/payment_intents/create',
  PAYMENT_INTENTS_GET: (id: string) => `/api/v1/pa/payment_intents/${id}`,
  PAYMENT_INTENTS_CONFIRM: (id: string) => `/api/v1/pa/payment_intents/${id}/confirm`,
  PAYMENT_INTENTS_CAPTURE: (id: string) => `/api/v1/pa/payment_intents/${id}/capture`,
  PAYMENT_INTENTS_CANCEL: (id: string) => `/api/v1/pa/payment_intents/${id}/cancel`,

  // Refunds
  REFUNDS_CREATE: '/api/v1/pa/refunds/create',
  REFUNDS_GET: (id: string) => `/api/v1/pa/refunds/${id}`,

  // Merchant Config
  PAYMENT_METHOD_TYPES: '/api/v1/pa/config/payment_method_types',

  // Apple Pay Domain Registration
  APPLEPAY_DOMAINS_LIST: '/api/v1/pa/config/applepay/registered_domains',
  APPLEPAY_DOMAINS_ADD: '/api/v1/pa/config/applepay/registered_domains/add_items',

  // Apple Pay Session
  APPLEPAY_SESSION: '/api/v1/pa/payment_session/start',
} as const;

module.exports = {
  ENVIRONMENTS,
  API_ENDPOINTS,
};

export default {
  ENVIRONMENTS,
  API_ENDPOINTS,
};
