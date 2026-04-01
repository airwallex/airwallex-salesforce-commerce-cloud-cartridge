/**
 * Unit tests for basketHelper module
 */

const basketHelper = require('../basketHelper');

const {
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
  buildAddress,
  buildProducts,
  buildShipping,
  buildCustomerDetails,
  buildOrderObject,
  BASKET_ATTRS,
} = basketHelper;

// Create a mock basket for testing
const createMockBasket = (overrides = {}) => ({
  UUID: 'test-basket-uuid',
  currencyCode: 'USD',
  totalGrossPrice: { value: 100.0, currencyCode: 'USD' },
  custom: {},
  billingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: null,
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94105',
    countryCode: { value: 'US' },
    phone: '555-1234',
  },
  customer: {
    ID: 'customer-123',
    profile: {
      email: 'customer@example.com',
    },
  },
  customerEmail: 'test@example.com',
  defaultShipment: {
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      address2: null,
      city: 'San Francisco',
      stateCode: 'CA',
      postalCode: '94105',
      countryCode: { value: 'US' },
      phone: '555-1234',
    },
    shippingMethod: {
      displayName: 'Standard Shipping',
      ID: 'standard',
    },
    shippingTotalPrice: { value: 5.0, currencyCode: 'USD' },
  },
  productLineItems: [
    {
      productID: 'PROD-001',
      productName: 'Test Product 1',
      quantityValue: 2,
      basePrice: { value: 25.0, currencyCode: 'USD' },
    },
    {
      productID: 'PROD-002',
      productName: 'Test Product 2',
      quantityValue: 1,
      basePrice: { value: 50.0, currencyCode: 'USD' },
    },
  ],
  ...overrides,
});

describe('basketHelper', () => {
  describe('BASKET_ATTRS', () => {
    it('has correct attribute keys', () => {
      expect(BASKET_ATTRS.PAYMENT_INTENT_ID).toBe('awxPaymentIntentId');
      expect(BASKET_ATTRS.CLIENT_SECRET).toBe('awxPaymentIntentClientSecret');
      expect(BASKET_ATTRS.RESERVED_ORDER_NO).toBe('awxReservedOrderNo');
      expect(BASKET_ATTRS.PARAMS_FINGERPRINT).toBe('awxPaymentIntentParamsFingerprint');
    });
  });

  describe('getPaymentIntentId / setPaymentIntentId', () => {
    it('returns null when not set', () => {
      const basket = createMockBasket();
      expect(getPaymentIntentId(basket)).toBeNull();
    });

    it('returns the payment intent ID when set', () => {
      const basket = createMockBasket();
      setPaymentIntentId(basket, 'int_test123');
      expect(getPaymentIntentId(basket)).toBe('int_test123');
    });

    it('sets the payment intent ID in custom attributes', () => {
      const basket = createMockBasket();
      setPaymentIntentId(basket, 'int_abc456');
      expect(basket.custom[BASKET_ATTRS.PAYMENT_INTENT_ID]).toBe('int_abc456');
    });
  });

  describe('getClientSecret / setClientSecret', () => {
    it('returns null when not set', () => {
      const basket = createMockBasket();
      expect(getClientSecret(basket)).toBeNull();
    });

    it('returns the client secret when set', () => {
      const basket = createMockBasket();
      setClientSecret(basket, 'cs_testSecret');
      expect(getClientSecret(basket)).toBe('cs_testSecret');
    });

    it('sets the client secret in custom attributes', () => {
      const basket = createMockBasket();
      setClientSecret(basket, 'cs_anotherSecret');
      expect(basket.custom[BASKET_ATTRS.CLIENT_SECRET]).toBe('cs_anotherSecret');
    });
  });

  describe('getReservedOrderNo / setReservedOrderNo', () => {
    it('returns null when not set', () => {
      const basket = createMockBasket();
      expect(getReservedOrderNo(basket)).toBeNull();
    });

    it('returns the reserved order number when set', () => {
      const basket = createMockBasket();
      setReservedOrderNo(basket, 'ORD-123456');
      expect(getReservedOrderNo(basket)).toBe('ORD-123456');
    });

    it('sets the reserved order number in custom attributes', () => {
      const basket = createMockBasket();
      setReservedOrderNo(basket, 'ORD-789012');
      expect(basket.custom[BASKET_ATTRS.RESERVED_ORDER_NO]).toBe('ORD-789012');
    });
  });

  describe('getParamsFingerprint / setParamsFingerprint', () => {
    it('returns null when not set', () => {
      const basket = createMockBasket();
      expect(getParamsFingerprint(basket)).toBeNull();
    });

    it('returns the fingerprint when set', () => {
      const basket = createMockBasket();
      setParamsFingerprint(basket, '{"amount":100,"currency":"USD"}');
      expect(getParamsFingerprint(basket)).toBe('{"amount":100,"currency":"USD"}');
    });

    it('stores the fingerprint in custom attributes', () => {
      const basket = createMockBasket();
      setParamsFingerprint(basket, 'fp_test');
      expect(basket.custom[BASKET_ATTRS.PARAMS_FINGERPRINT]).toBe('fp_test');
    });
  });

  describe('clearAirwallexData', () => {
    it('clears all Airwallex data from basket including fingerprint', () => {
      const basket = createMockBasket();
      setPaymentIntentId(basket, 'int_test');
      setClientSecret(basket, 'cs_test');
      setReservedOrderNo(basket, 'ORD-test');
      setParamsFingerprint(basket, '{"amount":100}');

      clearAirwallexData(basket);

      expect(basket.custom[BASKET_ATTRS.PAYMENT_INTENT_ID]).toBeNull();
      expect(basket.custom[BASKET_ATTRS.CLIENT_SECRET]).toBeNull();
      expect(basket.custom[BASKET_ATTRS.RESERVED_ORDER_NO]).toBeNull();
      expect(basket.custom[BASKET_ATTRS.PARAMS_FINGERPRINT]).toBeNull();
    });
  });

  describe('buildPaymentIntentFingerprint', () => {
    const baseParams = {
      appName: 'apm',
      amount: 100,
      currency: 'USD',
      orderId: 'ORD-001',
      returnUrl: 'https://example.com/return',
      order: { type: 'physical_goods', products: [{ code: 'P1', quantity: 2 }] },
      customer: { first_name: 'John', last_name: 'Doe' },
      metadata: { basketId: 'basket-123' },
    };

    it('returns a fixed-length hex hash string', () => {
      const fingerprint = buildPaymentIntentFingerprint(baseParams);

      expect(typeof fingerprint).toBe('string');
      expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns the same fingerprint for identical params', () => {
      const fp1 = buildPaymentIntentFingerprint(baseParams);
      const fp2 = buildPaymentIntentFingerprint({ ...baseParams });

      expect(fp1).toBe(fp2);
    });

    it('returns a different fingerprint when any param changes', () => {
      const original = buildPaymentIntentFingerprint(baseParams);

      expect(buildPaymentIntentFingerprint({ ...baseParams, amount: 200 })).not.toBe(original);
      expect(buildPaymentIntentFingerprint({ ...baseParams, currency: 'EUR' })).not.toBe(original);
      expect(buildPaymentIntentFingerprint({ ...baseParams, orderId: 'ORD-002' })).not.toBe(original);
      expect(buildPaymentIntentFingerprint({ ...baseParams, returnUrl: 'https://other.com' })).not.toBe(original);
      expect(
        buildPaymentIntentFingerprint({
          ...baseParams,
          customer: { first_name: 'Jane', last_name: 'Smith' },
        }),
      ).not.toBe(original);
      expect(
        buildPaymentIntentFingerprint({
          ...baseParams,
          order: { type: 'digital_goods', products: [] },
        }),
      ).not.toBe(original);
      expect(
        buildPaymentIntentFingerprint({
          ...baseParams,
          metadata: { basketId: 'other-basket' },
        }),
      ).not.toBe(original);
    });
  });

  describe('getBasketTotal', () => {
    it('returns the total as decimal for standard currencies', () => {
      const basket = createMockBasket({
        totalGrossPrice: { value: 99.99, currencyCode: 'USD' },
      });
      expect(getBasketTotal(basket)).toBe(99.99);
    });

    it('returns rounded amount for Airwallex zero-decimal currencies (IDR)', () => {
      const basket = createMockBasket({
        totalGrossPrice: { value: 1000.5, currencyCode: 'IDR' },
        currencyCode: 'IDR',
      });
      expect(getBasketTotal(basket)).toBe(1001);
    });

    it('returns decimal amount for other currencies', () => {
      const basket = createMockBasket({
        totalGrossPrice: { value: 100.0, currencyCode: 'USD' },
      });
      expect(getBasketTotal(basket)).toBe(100);
    });
  });

  describe('getBasketCurrency', () => {
    it('returns the basket currency code', () => {
      const basket = createMockBasket({ currencyCode: 'EUR' });
      expect(getBasketCurrency(basket)).toBe('EUR');
    });

    it('returns USD by default', () => {
      const basket = createMockBasket();
      expect(getBasketCurrency(basket)).toBe('USD');
    });
  });

  describe('buildAddress', () => {
    it('returns undefined for null address', () => {
      expect(buildAddress(null)).toBeUndefined();
    });

    it('builds address object from shipping address', () => {
      const shippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94105',
        countryCode: { value: 'US' },
        phone: '555-1234',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = buildAddress(shippingAddress as any);

      expect(result).toEqual({
        country_code: 'US',
        state: 'CA',
        city: 'San Francisco',
        street: '123 Main St',
        postcode: '94105',
      });
    });

    it('handles missing optional fields', () => {
      const minimalAddress = {
        countryCode: { value: 'US' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = buildAddress(minimalAddress as any);

      expect(result).toEqual({
        country_code: 'US',
        state: undefined,
        city: undefined,
        street: undefined,
        postcode: undefined,
      });
    });
  });

  describe('buildProducts', () => {
    it('builds products array from product line items', () => {
      const basket = createMockBasket();
      const products = buildProducts(basket);

      expect(products).toHaveLength(2);
      expect(products[0]).toEqual({
        type: 'physical',
        code: 'PROD-001',
        name: 'Test Product 1',
        sku: 'PROD-001',
        quantity: 2,
        unit_price: 25,
        desc: 'Test Product 1',
      });
      expect(products[1]).toEqual({
        type: 'physical',
        code: 'PROD-002',
        name: 'Test Product 2',
        sku: 'PROD-002',
        quantity: 1,
        unit_price: 50,
        desc: 'Test Product 2',
      });
    });

    it('returns empty array for basket with no products', () => {
      const basket = createMockBasket({ productLineItems: [] });
      const products = buildProducts(basket);
      expect(products).toEqual([]);
    });
  });

  describe('buildShipping', () => {
    it('builds shipping object from default shipment', () => {
      const basket = createMockBasket();
      const shipping = buildShipping(basket);

      expect(shipping).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '555-1234',
        shipping_method: 'Standard Shipping',
        address: {
          country_code: 'US',
          state: 'CA',
          city: 'San Francisco',
          street: '123 Main St',
          postcode: '94105',
        },
        fee_amount: 5,
      });
    });

    it('returns undefined when no shipment exists', () => {
      const basket = createMockBasket({ defaultShipment: null });
      expect(buildShipping(basket)).toBeUndefined();
    });

    it('returns undefined when no shipping address exists', () => {
      const basket = createMockBasket({
        defaultShipment: { shippingAddress: null },
      });
      expect(buildShipping(basket)).toBeUndefined();
    });
  });

  describe('buildCustomerDetails', () => {
    it('builds customer details from billing address and customer', () => {
      const basket = createMockBasket();
      const customerDetails = buildCustomerDetails(basket);

      expect(customerDetails).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        email: 'customer@example.com',
        phone_number: '555-1234',
        address: {
          country_code: 'US',
          state: 'CA',
          city: 'San Francisco',
          street: '123 Main St',
          postcode: '94105',
        },
        merchant_customer_id: 'customer-123',
      });
    });

    it('falls back to customerEmail when profile email is not available', () => {
      const basket = createMockBasket({
        customer: null,
        customerEmail: 'fallback@example.com',
      });
      const customerDetails = buildCustomerDetails(basket);

      expect(customerDetails?.email).toBe('fallback@example.com');
    });

    it('returns undefined when no billing address and no customer', () => {
      const basket = createMockBasket({
        billingAddress: null,
        customer: null,
      });
      expect(buildCustomerDetails(basket)).toBeUndefined();
    });
  });

  describe('buildOrderObject', () => {
    it('builds complete order object', () => {
      const basket = createMockBasket();
      const order = buildOrderObject(basket);

      expect(order.type).toBe('physical_goods');
      expect(order.products).toHaveLength(2);
      expect(order.shipping).toBeDefined();
    });

    it('handles basket without shipping', () => {
      const basket = createMockBasket({ defaultShipment: null });
      const order = buildOrderObject(basket);

      expect(order.type).toBe('physical_goods');
      expect(order.shipping).toBeUndefined();
    });
  });
});
