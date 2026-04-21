import type { Payment } from '@airwallex/components-sdk';
import type { OrderAddress } from '../../../types';

const getErrorContainer = (): HTMLElement | null => document.getElementById('awx-card-error');

export const displayError = (errorMsg: string): void => {
  const container = getErrorContainer();
  if (container) container.textContent = errorMsg;
};

export const clearError = (): void => {
  const container = getErrorContainer();
  if (container) container.textContent = '';
};

export const generateBilling = (billingAddress: OrderAddress, email: string): Payment.Billing => {
  return {
    email,
    first_name: billingAddress.firstName,
    last_name: billingAddress.lastName,
    address: {
      city: billingAddress.city,
      country_code: billingAddress.countryCode.value,
      postcode: billingAddress.postalCode,
      state: billingAddress.stateCode,
      street: billingAddress.address1,
    },
  };
};

export const isCardTabActive = (): boolean =>
  document.querySelector('.credit-card-tab')?.classList.contains('active') ?? false;
