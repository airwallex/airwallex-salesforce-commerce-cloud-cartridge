/**
 * Airwallex API request/response types
 */

import { PaymentAttemptStatus, PaymentIntentStatus, RefundStatus } from '../../constants/paymentStatus';

// ============================================================================
// Service Types
// ============================================================================

export interface ServiceRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string;
  headers?: Record<string, string>;
}

export interface ServiceResponse {
  statusCode: number;
  text: string;
  errorText: string;
}

export interface AirwallexServiceConfig {
  serviceId: string;
  baseUrl: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface AirwallexApiError {
  code: string;
  message: string;
  source?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AirwallexApiError;
  statusCode: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthTokenResponse {
  token: string;
  expires_at: string;
}

// ============================================================================
// Payment Intent Types
// ============================================================================

export interface Address {
  country_code: string;
  state?: string;
  city?: string;
  street?: string;
  postcode?: string;
}

export interface CustomerDetails {
  first_name?: string;
  last_name?: string;
  business_name?: string;
  email?: string;
  phone_number?: string;
  address?: Address;
  merchant_customer_id?: string;
}

export interface Product {
  type?: string;
  code?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unit_price?: number;
  desc?: string;
  url?: string;
  image_url?: string;
  effective_start_at?: string;
  effective_end_at?: string;
  category?: string;
}

export interface Shipping {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  shipping_method?: string;
  address?: Address;
  shipping_delayed_at?: string;
  fee_amount?: number;
}

export interface Discount {
  coupon_code?: string;
}

export interface Order {
  type?: string;
  products?: Product[];
  shipping?: Shipping;
  discount?: Discount;
}

export interface CardRiskControl {
  skip_risk_processing?: boolean;
  three_ds_action?: string;
}

export interface CardOptions {
  risk_control?: CardRiskControl;
  card_input_via?: string; // ecommerce | moto
  three_ds_action?: string;
  auto_capture?: boolean;
  authorization_type?: string;
}

export interface PaymentMethodOptions {
  card?: CardOptions;
}

export interface RiskControlOptions {
  skip_risk_processing?: boolean;
  tra_applicable?: boolean;
}

export interface FundsSplitData {
  amount: number;
  destination: string;
}

export interface ExternalRecurringData {
  merchant_trigger_reason?: string;
  original_network_transaction_id?: string;
}

export interface PaymentMethodCard {
  brand?: string;
  last4?: string;
  expiry_month?: string;
  expiry_year?: string;
  name?: string;
  bin?: string;
  fingerprint?: string;
  issuer_country_code?: string;
  issuer_name: string;
  is_commercial?: string;
  card_type?: string;
  number_type?: string;
  avs_check?: string;
  cvc_check?: string;
}

export interface PaymentMethodBilling {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address?: Address;
}

export interface AttemptPaymentMethod {
  id?: string;
  customer_id?: string;
  type?: string;
  card?: PaymentMethodCard;
  billing?: PaymentMethodBilling;
  metadata?: Record<string, string>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiskFactor {
  description?: string;
}

export interface FraudData {
  action?: string;
  score?: string;
  risk_factors?: RiskFactor[];
}

export interface DsData {
  version?: string;
  liability_shift_indicator?: string;
  eci?: string;
  cavv?: string;
  xid?: string;
  enrolled?: string;
  pa_res_status?: string;
  ps_res_status_reason?: string;
  challenge_cancellation_reason?: string;
  frictionless?: string;
  sca_exemption?: string;
  triggering_reason?: string;
  retry_count_for_auth_decline?: number;
}

export interface AuthenticationData {
  avs_result?: string;
  cvc_result?: string;
  avs_code?: string;
  cvc_code?: string;
  ds_data: DsData;
  fraud_data: FraudData;
}

export interface DccResponse {
  amount?: number;
  currency?: string;
}

export interface PaymentAttempt {
  id: string;
  amount?: number;
  currency?: string;
  payment_method?: AttemptPaymentMethod;
  merchant_order_id?: string;
  payment_intent_id?: string;
  payment_consent_id?: string;
  status?: PaymentAttemptStatus;
  provider_transaction_id?: string;
  payment_method_transaction_id?: string;
  acquirer_reference_number?: string;
  provider_original_response_code?: string;
  authorization_code?: string;
  merchant_advice_code?: string;
  failure_code?: string;
  captured_amount?: number;
  refunded_amount?: number;
  is_refunded?: string;
  created_at?: string;
  updated_at?: string;
  dcc_data?: DccResponse;
  settle_via?: string;
  authentication_data?: AuthenticationData;
}

export interface ReferrerData {
  type: string;
  version: string;
}

export interface CreatePaymentIntentRequest {
  request_id: string;
  amount: number;
  currency: string;
  merchant_order_id: string;
  order?: Order;
  customer_id?: string;
  customer?: CustomerDetails;
  descriptor?: string;
  metadata?: Record<string, string>;
  return_url?: string;
  payment_method_options?: PaymentMethodOptions;
  connected_account_id?: string;
  risk_control_options?: RiskControlOptions;
  funds_split_data?: FundsSplitData[];
  external_recurring_data?: ExternalRecurringData;
  referrer_data?: ReferrerData;
}

export interface ConfirmPaymentIntentRequest {
  request_id: string;
  payment_method?: {
    type: string;
    card?: {
      number: string;
      expiry_month: string;
      expiry_year: string;
      cvc: string;
      name?: string;
    };
  };
  payment_method_options?: PaymentMethodOptions;
}

export interface NextAction {
  type?: string;
  qrcode?: string;
  method?: string;
  content_type?: string;
  url?: string;
  data?: Record<string, unknown>;
  stage?: string;
  micro_deposit_count?: string;
  email?: string;
  package_name?: string;
  fallback_url?: string;
  redirect_params?: Record<string, unknown>;
}

export interface CurrencySwitcher {
  allowed_currencies: string[];
}

export interface PaymentIntentResponse {
  id: string;
  request_id: string;
  amount: number;
  currency: string;
  base_amount?: number;
  base_currency?: string;
  merchant_order_id: string;
  order?: Order;
  customer_id?: string;
  customer?: CustomerDetails;
  payment_consent_id?: string;
  descriptor?: string;
  metadata?: Record<string, string>;
  status: PaymentIntentStatus;
  captured_amount?: number;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  available_payment_method_types?: string[];
  payment_method_options?: PaymentMethodOptions;
  next_action?: NextAction;
  client_secret: string;
  connected_account_id?: string;
  risk_control_options?: RiskControlOptions;
  latest_payment_attempt?: PaymentAttempt;
  return_url?: string;
  funds_split_data?: FundsSplitData[];
  currency_switcher?: CurrencySwitcher;
  referrer_data?: ReferrerData;
}

export interface CapturePaymentIntentRequest {
  amount?: number;
  request_id: string;
}

export interface CancelPaymentIntentRequest {
  request_id: string;
  cancellation_reason?: string;
}

// ============================================================================
// Refund Types
// ============================================================================

export interface CreateRefundRequest {
  payment_intent_id: string;
  amount: number;
  reason?: string;
  request_id: string;
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  id: string;
  request_id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Merchant Config Types
// ============================================================================

export interface QueryPaymentMethodTypesRequest {
  transaction_currency?: string;
  country_code?: string;
  transaction_mode?: 'oneoff' | 'recurring';
  active?: boolean;
  resources_needed?: boolean;
  page_num?: number;
  page_size?: number;
}

export interface Logo {
  svg?: string;
  png?: string;
}

export interface CardSchemeResources {
  logos: Record<string, string>;
}

export interface CardScheme {
  name: string;
  display_name?: string;
  resources?: CardSchemeResources;
}

export interface PaymentMethodResource {
  has_schema: boolean;
  logos?: Logo;
}

export interface PaymentMethodTypeConfig {
  name: string;
  display_name?: string;
  transaction_mode: string;
  flows: string[];
  transaction_currencies: string[];
  country_codes: string[];
  active: boolean;
  card_schemes?: CardScheme[];
  resources?: PaymentMethodResource;
  surchargeFee_percentage?: number;
  verification_methods?: string[];
}

export interface PaymentMethodTypesResponse {
  has_more: boolean;
  items: PaymentMethodTypeConfig[];
}

// ============================================================================
// Apple Pay Domain Registration Types
// ============================================================================

export interface ApplePayDomainsRegisterRequest {
  items: string[];
}

export interface ApplePayRegisteredDomainsResponse {
  items: string[];
}

export interface ApplePaySessionRequest {
  validation_url: string;
  initiative_context: string;
  request_id: string;
}

export interface ApplePaySessionResponse {
  epochTimestamp: number;
  expiresAt: number;
  merchantSessionIdentifier: string;
  nonce: string;
  merchantIdentifier: string;
  domainName: string;
  displayName: string;
  signature: string;
  operationalAnalyticsIdentifier: string;
  retries: number;
  pspId: string;
}
