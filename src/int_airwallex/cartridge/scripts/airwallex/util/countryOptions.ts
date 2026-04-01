/**
 * Country options utility for shipping address forms
 * Extracts country dropdown options from SFRA shipping form
 */

import server from 'server';

import type { FormFieldOptionPlain } from 'server';

/**
 * Get country options from the shipping form
 */
const getCountryOptions = (): FormFieldOptionPlain[] => {
  const shippingForm = server.forms.getForm('shipping');
  return shippingForm.shippingAddress.addressFields.country.options;
};

const countryOptions = {
  getCountryOptions,
};

module.exports = countryOptions;
export default countryOptions;
export { getCountryOptions };
