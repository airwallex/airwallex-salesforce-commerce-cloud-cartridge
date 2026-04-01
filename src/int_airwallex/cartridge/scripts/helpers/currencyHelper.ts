/**
 * Currency and amount formatting utilities for Airwallex API
 *
 * Note: Airwallex accepts decimal amounts (not minor units like some other payment providers).
 * However, certain currencies only support 0 decimal places per Airwallex requirements.
 */

import Money = require('dw/value/Money');

// Currencies that Airwallex requires 0 decimal places for
const ZERO_DECIMAL_CURRENCIES = ['IDR', 'HUF', 'MGA', 'TWD'];

/**
 * Format amount for Airwallex API
 * Airwallex accepts decimal amounts, but zero-decimal currencies must be rounded
 */
const formatAmount = (amount: number, currencyCode: string): number => {
  const code = currencyCode.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.includes(code)) {
    return Math.round(amount);
  }

  // Return decimal amount as-is for other currencies
  return amount;
};

/**
 * Format a Money object for Airwallex API
 */
const formatMoneyForApi = (money: Money): number => {
  return formatAmount(money.value, money.currencyCode);
};

/**
 * Get the decimal places for a currency (per Airwallex requirements)
 */
const getDecimalPlaces = (currencyCode: string): number => {
  const code = currencyCode.toUpperCase();
  return ZERO_DECIMAL_CURRENCIES.includes(code) ? 0 : 2;
};

const currencyHelper = {
  formatAmount,
  formatMoneyForApi,
  getDecimalPlaces,
  ZERO_DECIMAL_CURRENCIES,
};

module.exports = currencyHelper;
export default currencyHelper;
export { formatAmount, formatMoneyForApi, getDecimalPlaces, ZERO_DECIMAL_CURRENCIES };
