import type { Payment } from '@airwallex/components-sdk';
import type PaymentInstrument from 'dw/order/PaymentInstrument';
import type { AvailableShippingOption } from '@/cartridge/scripts/airwallex/payments/shippingOptions';
import type { CartModelInstance } from '*/cartridge/models/cart';
import type { FormFieldOptionPlain } from 'server';

export interface PaymentInstrumentCustomAttributes {
  awxPaymentIntentId: string;
  awxPaymentIntentClientSecret: string;
  awxCurrency: string;
  awxContinueUrl: string;
  awxPaymentMethodType: string;
}

export interface OrderAddress {
  address1: string;
  address2: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: {
    value: string;
    displayValue: string;
  };
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Order {
  billing: {
    payment: {
      selectedPaymentInstruments: (PaymentInstrument & PaymentInstrumentCustomAttributes)[];
    };
    billingAddress: {
      address: OrderAddress;
    };
  };
  orderEmail: string;
}

// Union type for functions that work with any split card element (e.g., setupElementEvents)
export type SplitCardElement = Payment.CardNumberElementType | Payment.ExpiryDateElementType | Payment.CvcElementType;

// Generic state for card elements - preserves specific element type
export interface CardElementState<T = SplitCardElement> {
  element: T | null | undefined;
  container: HTMLDivElement;
  complete: boolean;
}

export interface ExpressCheckoutElementState<T> {
  element: T | null | undefined;
  container: HTMLDivElement;
}

// Each property uses specific element type for proper method access
export interface CardFormState {
  cardNumber: CardElementState<Payment.CardNumberElementType> | null;
  expiry: CardElementState<Payment.ExpiryDateElementType> | null;
  cvc: CardElementState<Payment.CvcElementType> | null;
  dropIn: CardElementState<Payment.DropInElementType> | null;
}

export interface CardPaymentError {
  code?: string;
  details?: {
    card_brand: string;
    card_type: string;
    cause: string;
    is_commercial: boolean;
    issuing_bank_name: string;
    original_response_code: string;
  };
  message?: string;
  original_code?: string;
}

export interface Amount {
  currency: string;
  value: number;
}

export interface ExpressCheckoutMethodsResponse {
  amount: Amount | null;
  countryCode: string;
  storeName: string;
  shippingAddressCountryOptions: FormFieldOptionPlain[];
}

export interface CreateTemporaryBasketResponse {
  temporaryBasketCreated: boolean;
  amount: Amount;
}

export interface ShippingOptionsResponse {
  shippingMethods: AvailableShippingOption[];
}

export interface SelectShippingMethodResponse {
  cart: CartModelInstance;
  grandTotal: Amount;
}

export interface ExpressCheckoutAuthorizationResponse {
  paymentIntentId: string;
  clientSecret: string;
  redirectUrl?: string;
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

// The type is not provided in the SDK, so we need to define it ourselves
export interface Quote {
  client_rate: number;
  currency_pair: string;
  id: string;
  payment_amount: number;
  payment_currency: string;
  refresh_at: string;
  target_amount: number;
  target_currency: string;
}
