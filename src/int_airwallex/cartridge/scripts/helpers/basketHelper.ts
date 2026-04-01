/**
 * Basket utilities for Airwallex payment integration
 */

import Basket = require('dw/order/Basket');
import Transaction = require('dw/system/Transaction');
import MessageDigest = require('dw/crypto/MessageDigest');
import { formatAmount } from './currencyHelper';
import { PAYMENT_METHOD_ID } from '../constants/appConfig';
import type { Order, Product, Shipping, CustomerDetails, Address } from '../airwallex/api/types';

// Custom attribute keys for Airwallex data stored on basket
const BASKET_ATTRS = {
  PAYMENT_INTENT_ID: 'awxPaymentIntentId',
  CLIENT_SECRET: 'awxPaymentIntentClientSecret',
  RESERVED_ORDER_NO: 'awxReservedOrderNo',
  PARAMS_FINGERPRINT: 'awxPaymentIntentParamsFingerprint',
} as const;

/**
 * Get the payment intent ID stored on the basket
 */
const getPaymentIntentId = (basket: Basket): string | null => {
  const value = basket.custom[BASKET_ATTRS.PAYMENT_INTENT_ID];
  return value || null;
};

/**
 * Set the payment intent ID on the basket
 */
const setPaymentIntentId = (basket: Basket, paymentIntentId: string): void => {
  Transaction.wrap(() => {
    basket.custom[BASKET_ATTRS.PAYMENT_INTENT_ID] = paymentIntentId;
  });
};

/**
 * Get the client secret stored on the basket
 */
const getClientSecret = (basket: Basket): string | null => {
  const value = basket.custom[BASKET_ATTRS.CLIENT_SECRET];
  return value || null;
};

/**
 * Set the client secret on the basket
 */
const setClientSecret = (basket: Basket, clientSecret: string): void => {
  Transaction.wrap(() => {
    basket.custom[BASKET_ATTRS.CLIENT_SECRET] = clientSecret;
  });
};

/**
 * Get the reserved order number stored on the basket (for Drop-in flow)
 */
const getReservedOrderNo = (basket: Basket): string | null => {
  const value = basket.custom[BASKET_ATTRS.RESERVED_ORDER_NO];
  return value || null;
};

/**
 * Set the reserved order number on the basket
 */
const setReservedOrderNo = (basket: Basket, orderNo: string): void => {
  Transaction.wrap(() => {
    basket.custom[BASKET_ATTRS.RESERVED_ORDER_NO] = orderNo;
  });
};

/**
 * Get the params fingerprint stored on the basket
 */
const getParamsFingerprint = (basket: Basket): string | null => {
  const value = basket.custom[BASKET_ATTRS.PARAMS_FINGERPRINT];
  return value || null;
};

/**
 * Set the params fingerprint on the basket
 */
const setParamsFingerprint = (basket: Basket, fingerprint: string): void => {
  Transaction.wrap(() => {
    basket.custom[BASKET_ATTRS.PARAMS_FINGERPRINT] = fingerprint;
  });
};

/**
 * Build a deterministic SHA-256 hash fingerprint from the given create params.
 * Hashes the JSON-serialised params to a fixed-length string so that large
 * basket payloads don't bloat the stored custom attribute.
 */
const buildPaymentIntentFingerprint = (params: Record<string, unknown>): string => {
  const digest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
  return digest.digest(JSON.stringify(params));
};

/**
 * Clear all Airwallex payment data from the basket
 */
const clearAirwallexData = (basket: Basket): void => {
  Transaction.wrap(() => {
    basket.custom[BASKET_ATTRS.PAYMENT_INTENT_ID] = null;
    basket.custom[BASKET_ATTRS.CLIENT_SECRET] = null;
    basket.custom[BASKET_ATTRS.RESERVED_ORDER_NO] = null;
    basket.custom[BASKET_ATTRS.PARAMS_FINGERPRINT] = null;
  });
};

/**
 * Get the basket total amount formatted for Airwallex API
 */
const getBasketTotal = (basket: Basket): number => {
  const total = basket.totalGrossPrice;
  return formatAmount(total.value, total.currencyCode);
};

/**
 * Get the basket currency code
 */
const getBasketCurrency = (basket: Basket): string => {
  return basket.currencyCode;
};

/**
 * Build a shipping address from basket shipping address
 */
const buildAddress = (shippingAddress: dw.order.OrderAddress | null): Address | undefined => {
  if (!shippingAddress) {
    return undefined;
  }

  return {
    country_code: shippingAddress.countryCode?.value || '',
    state: shippingAddress.stateCode || undefined,
    city: shippingAddress.city || undefined,
    street: shippingAddress.address1 || undefined,
    postcode: shippingAddress.postalCode || undefined,
  };
};

/**
 * Build products array from basket product line items
 */
const buildProducts = (basket: Basket): Product[] => {
  const products: Product[] = [];
  const productLineItems = basket.productLineItems;

  for (let i = 0; i < productLineItems.length; i++) {
    const pli = productLineItems[i];
    const product: Product = {
      type: 'physical',
      code: pli.productID,
      name: pli.productName,
      sku: pli.productID,
      quantity: pli.quantityValue,
      unit_price: formatAmount(pli.basePrice.value, basket.currencyCode),
      desc: pli.productName,
    };
    products.push(product);
  }

  return products;
};

/**
 * Build shipping object from basket default shipment
 */
const buildShipping = (basket: Basket): Shipping | undefined => {
  const shipment = basket.defaultShipment;
  if (!shipment || !shipment.shippingAddress) {
    return undefined;
  }

  const shippingAddress = shipment.shippingAddress;
  const shippingMethod = shipment.shippingMethod;
  const shippingCost = shipment.shippingTotalPrice;

  return {
    first_name: shippingAddress.firstName || undefined,
    last_name: shippingAddress.lastName || undefined,
    phone_number: shippingAddress.phone || undefined,
    shipping_method: shippingMethod?.displayName || undefined,
    address: buildAddress(shippingAddress),
    fee_amount: shippingCost ? formatAmount(shippingCost.value, basket.currencyCode) : undefined,
  };
};

/**
 * Build customer details from basket customer and billing address
 */
const buildCustomerDetails = (basket: Basket): CustomerDetails | undefined => {
  const billingAddress = basket.billingAddress;
  const customer = basket.customer;

  if (!billingAddress && !customer) {
    return undefined;
  }

  return {
    first_name: billingAddress?.firstName || undefined,
    last_name: billingAddress?.lastName || undefined,
    email: customer?.profile?.email || basket.customerEmail || undefined,
    phone_number: billingAddress?.phone || undefined,
    address: buildAddress(billingAddress),
    merchant_customer_id: customer?.ID || undefined,
  };
};

/**
 * Build the complete order object for Airwallex API
 */
const buildOrderObject = (basket: Basket): Order => {
  return {
    type: 'physical_goods',
    products: buildProducts(basket),
    shipping: buildShipping(basket),
  };
};

/**
 * Check if the basket contains an Airwallex payment instrument
 */
const hasAirwallexPaymentInstrument = (basket: Basket): boolean => {
  const paymentInstruments = basket.getPaymentInstruments();
  for (let i = 0; i < paymentInstruments.length; i++) {
    const method = paymentInstruments[i].paymentMethod;
    if (method === PAYMENT_METHOD_ID.CARD || method === PAYMENT_METHOD_ID.APM) {
      return true;
    }
  }
  return false;
};

const basketHelper = {
  getPaymentIntentId,
  setPaymentIntentId,
  getClientSecret,
  setClientSecret,
  getReservedOrderNo,
  setReservedOrderNo,
  getParamsFingerprint,
  setParamsFingerprint,
  buildPaymentIntentFingerprint,
  clearAirwallexData,
  getBasketTotal,
  getBasketCurrency,
  buildOrderObject,
  buildProducts,
  buildShipping,
  buildCustomerDetails,
  buildAddress,
  hasAirwallexPaymentInstrument,
  BASKET_ATTRS,
};

module.exports = basketHelper;
export default basketHelper;
export {
  getPaymentIntentId,
  setPaymentIntentId,
  getClientSecret,
  setClientSecret,
  getReservedOrderNo,
  setReservedOrderNo,
  getParamsFingerprint,
  setParamsFingerprint,
  buildPaymentIntentFingerprint,
  clearAirwallexData,
  getBasketTotal,
  getBasketCurrency,
  buildOrderObject,
  buildProducts,
  buildShipping,
  buildCustomerDetails,
  buildAddress,
  hasAirwallexPaymentInstrument,
  BASKET_ATTRS,
};
