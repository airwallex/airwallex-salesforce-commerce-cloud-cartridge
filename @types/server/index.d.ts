import { Express } from 'express';

/**
 * Parsed form field option from SFRA formField converter.
 * Maps to the plain object structure from formField.js (checked, htmlValue, id, label, selected, value).
 */
export interface FormFieldOptionPlain {
  checked: boolean;
  htmlValue: string;
  id: string;
  label: string;
  selected: boolean;
  value: string;
}

/**
 * Address fields form group containing country and other address form fields.
 * Country field has options for country code dropdown (parsed by SFRA parseForm).
 */
interface AddressFieldsFormGroup {
  country: {
    options: FormFieldOptionPlain[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Shipping address form group containing address fields.
 */
interface ShippingAddressFormGroup {
  addressFields: AddressFieldsFormGroup;
  [key: string]: unknown;
}

/**
 * Parsed shipping form from SFRA server.forms.getForm('shipping').
 * Uses plain JS structure from parseForm, not raw dw.web.Form.
 */
interface ShippingForm {
  shippingAddress: ShippingAddressFormGroup;
  [key: string]: unknown;
}

interface FormsRegistry {
  getForm(name: 'shipping'): ShippingForm;
  getForm(name: string): { [key: string]: unknown };
}

interface ServerProps {
  exports: () => void;
  middleware: {
    https: any;
  };
  forms: FormsRegistry;
  extend(superModule: any): void;
  prepend(name: string, ...middlewares: any[]): void;
  append(name: string, ...middlewares: any[]): void;
  replace(name: string, ...middlewares: any[]): void;
}

declare const Server: Express & ServerProps;

export default Server;
