/**
 * Barrel export for Airwallex API clients
 */

export type { ApiResponse, AirwallexApiError } from './types';
export type {
  AuthTokenResponse,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  ConfirmPaymentIntentRequest,
  CapturePaymentIntentRequest,
  CancelPaymentIntentRequest,
  CreateRefundRequest,
  RefundResponse,
  QueryPaymentMethodTypesRequest,
  PaymentMethodTypesResponse,
  PaymentMethodTypeConfig,
  CardScheme,
  PaymentMethodResource,
  ApplePayDomainsRegisterRequest,
  ApplePayRegisteredDomainsResponse,
  ApplePaySessionRequest,
  ApplePaySessionResponse,
} from './types';

import baseClient from './baseClient';
import authentication from './authentication';
import paymentIntent from './paymentIntent';
import refund from './refund';
import merchantConfig from './merchantConfig';
import applePay from './applePay';

export { baseClient, authentication, paymentIntent, refund, merchantConfig, applePay };

const api = {
  base: baseClient,
  auth: authentication,
  paymentIntent,
  refund,
  merchantConfig,
  applePay,
};

module.exports = api;
export default api;
