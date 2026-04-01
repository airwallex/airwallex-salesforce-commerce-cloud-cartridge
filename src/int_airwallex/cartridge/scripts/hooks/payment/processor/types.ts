export interface Field {
  dynamicHtmlName: string;
  formType: string;
  value: string;
  valid: boolean;
  mandatory: boolean;
  minLength: number;
  maxLength: number;
}

export interface ValueObject<T> {
  value: T;
}

export interface Address {
  address1: Field;
  address2: Field;
  country: Field;
  city: Field;
  states: Field;
  phone: Field;
  postalCode: Field;
  name: Field;
  firstName: Field;
  lastName: Field;
}

export interface PaymentForm {
  valid: boolean;
  addressFields: Address;
  contactInfoFields: Field & {
    phone: Field;
  };
  paymentMethod: Field;
}

export interface ViewData {
  address: {
    firstName: ValueObject<string>;
    lastName: ValueObject<string>;
    address1: ValueObject<string>;
    address2: ValueObject<string>;
    city: ValueObject<string>;
    postalCode: ValueObject<string>;
    countryCode: ValueObject<string>;
    stateCode?: ValueObject<string>;
  };
  phone: ValueObject<string>;
}

export interface ViewDataExt extends ViewData {
  paymentMethod: {
    value: string;
    htmlName: string;
  };
}

export interface HandleResult {
  fieldErrors: Record<string, string>;
  serverErrors: string[];
  error: boolean;
  paymentIntent?: {
    id: string;
    clientSecret: string;
  };
  redirectUrl?: string;
}

export interface AuthorizeResult {
  error: boolean;
  authorized?: boolean;
  errorMessage?: string;
  paymentIntentId?: string;
  clientSecret?: string;
  requiresConfirmation?: boolean;
  redirectUrl?: string;
}

export interface PaymentInformation {
  [key: string]: unknown;
}
