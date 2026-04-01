/**
 * Unit tests for checkoutService module
 */

// Make this a module to avoid global scope conflicts
export {};

const OrderMgr = require('dw/order/OrderMgr');
const Order = require('dw/order/Order');
const Status = require('dw/system/Status');
const checkoutService = require('../checkoutService');
const basketHelper = require('../../helpers/basketHelper');
const orderHelper = require('../../helpers/orderHelper');
const configHelper = require('../../helpers/configHelper');
const logger = require('../../helpers/logger');

// Mock dependencies
jest.mock('../../helpers/basketHelper');
jest.mock('../../helpers/orderHelper');
jest.mock('../../helpers/configHelper');
jest.mock('../../helpers/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock SFCC storefront modules (virtual since paths don't exist in test env)
jest.mock(
  '*/cartridge/scripts/helpers/basketValidationHelpers',
  () => ({
    validateProducts: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  '*/cartridge/scripts/helpers/basketCalculationHelpers',
  () => ({
    calculateTotals: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  '*/cartridge/scripts/checkout/checkoutHelpers',
  () => ({
    calculatePaymentTransaction: jest.fn(),
  }),
  { virtual: true },
);
jest.mock('*/cartridge/scripts/helpers/hooks', () => jest.fn(), { virtual: true });
jest.mock(
  '*/cartridge/scripts/hooks/validateOrder',
  () => ({
    validateOrder: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  '*/cartridge/scripts/hooks/fraudDetection',
  () => ({
    fraudDetection: jest.fn(),
  }),
  { virtual: true },
);

// Get references to mocked modules after jest.mock hoisting
const mockValidationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
const mockBasketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
const mockCOHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
const mockHooksHelper = require('*/cartridge/scripts/helpers/hooks') as jest.Mock;

// Create mock basket with defaults that pass all validations
const createMockBasket = (overrides: Record<string, unknown> = {}) => ({
  UUID: 'basket-uuid-123',
  currencyCode: 'USD',
  totalGrossPrice: { value: 100.0, currencyCode: 'USD' },
  custom: {},
  defaultShipment: {
    shippingAddress: { firstName: 'John', lastName: 'Doe' },
  },
  billingAddress: { firstName: 'John', lastName: 'Doe' },
  getPaymentInstruments: jest
    .fn()
    .mockReturnValue([
      { paymentMethod: 'AirwallexCreditCard', paymentTransaction: { setPaymentProcessor: jest.fn() } },
    ]),
  ...overrides,
});

// Create mock payment intent
const createMockPaymentIntent = (overrides: Record<string, unknown> = {}) => ({
  id: 'int_test123',
  status: 'SUCCEEDED',
  amount: 10000,
  currency: 'USD',
  baseAmount: undefined,
  baseCurrency: undefined,
  capturedAmount: 10000,
  capture: jest.fn().mockReturnValue({
    id: 'int_test123',
    status: 'SUCCEEDED',
    capturedAmount: 10000,
    currency: 'USD',
  }),
  ...overrides,
});

/**
 * Set up default mock returns so that createOrder validations pass.
 * Call this in beforeEach, then override individual mocks per test.
 */
const setupPassingValidations = () => {
  basketHelper.hasAirwallexPaymentInstrument.mockReturnValue(true);
  basketHelper.getBasketTotal.mockReturnValue(10000);
  basketHelper.getBasketCurrency.mockReturnValue('USD');
  basketHelper.getPaymentIntentId.mockReturnValue('int_test123');
  basketHelper.getReservedOrderNo.mockReturnValue(null);
  basketHelper.clearAirwallexData.mockReturnValue(undefined);
  configHelper.getAutoCapture.mockReturnValue(false);
  mockValidationHelpers.validateProducts.mockReturnValue({ error: false });
  mockHooksHelper.mockReturnValue({ error: false });
  mockCOHelpers.calculatePaymentTransaction.mockReturnValue({ error: false });
};

describe('checkoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OrderMgr._reset();
    setupPassingValidations();
  });

  // ===========================================================================
  // createOrder
  // ===========================================================================
  describe('createOrder', () => {
    it('returns error when basket has no Airwallex payment instrument', () => {
      const basket = createMockBasket();
      basketHelper.hasAirwallexPaymentInstrument.mockReturnValue(false);

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No Airwallex payment instrument');
    });

    it('returns error when product validation fails', () => {
      const basket = createMockBasket();
      mockValidationHelpers.validateProducts.mockReturnValue({ error: true });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
    });

    it('returns error when order validation hook fails', () => {
      const basket = createMockBasket();
      mockHooksHelper.mockReturnValue({ error: true, message: 'Order validation failed' });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Order validation failed');
    });

    it('returns error with errorStage when no shipping address', () => {
      const basket = createMockBasket({
        defaultShipment: { shippingAddress: null },
      });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.errorStage).toEqual({ stage: 'shipping', step: 'address' });
    });

    it('returns error with errorStage when no billing address', () => {
      const basket = createMockBasket({ billingAddress: null });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.errorStage).toEqual({ stage: 'payment', step: 'billingAddress' });
    });

    it('calls basketCalculationHelpers.calculateTotals', () => {
      const basket = createMockBasket();

      checkoutService.createOrder(basket);

      expect(mockBasketCalculationHelpers.calculateTotals).toHaveBeenCalledWith(basket);
    });

    it('returns error when payment transaction calculation fails', () => {
      const basket = createMockBasket();
      mockCOHelpers.calculatePaymentTransaction.mockReturnValue({ error: true });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
    });

    it('creates order successfully with all validations passing', () => {
      const basket = createMockBasket();

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order.orderNo).toBeDefined();
      expect(OrderMgr.createOrder).toHaveBeenCalledWith(basket);
    });

    it('creates order with reserved order number', () => {
      const basket = createMockBasket();

      const result = checkoutService.createOrder(basket, 'RESERVED-001');

      expect(result.success).toBe(true);
      expect(OrderMgr.createOrder).toHaveBeenCalledWith(basket, 'RESERVED-001');
    });

    it('returns error when OrderMgr.createOrder throws', () => {
      const basket = createMockBasket();
      OrderMgr.createOrder.mockImplementationOnce(() => {
        throw new Error('Creation failed');
      });

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(false);
    });

    it('logs info when order created without reserved order number', () => {
      const basket = createMockBasket();

      const result = checkoutService.createOrder(basket);

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Order created without reserved order number',
        expect.objectContaining({
          basketId: 'basket-uuid-123',
          orderNo: expect.any(String),
        }),
      );
    });

    it('does not log info when reserved order number is provided', () => {
      const basket = createMockBasket();

      checkoutService.createOrder(basket, 'RESERVED-001');

      expect(logger.info).not.toHaveBeenCalledWith('Order created without reserved order number', expect.anything());
    });
  });

  // ===========================================================================
  // finalizeOrder
  // ===========================================================================
  describe('finalizeOrder', () => {
    it('updates order with payment data for SUCCEEDED status', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent({ status: 'SUCCEEDED' });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(true);
      expect(orderHelper.setPaymentIntentId).toHaveBeenCalledWith(mockOrder, 'int_test123');
      expect(orderHelper.setPaymentStatus).toHaveBeenCalledWith(mockOrder, 'SUCCEEDED');
      expect(orderHelper.updateOrderPaymentStatus).toHaveBeenCalledWith(mockOrder, 'SUCCEEDED');
      expect(OrderMgr.placeOrder).toHaveBeenCalledWith(mockOrder);
    });

    it('handles auto-capture when status is REQUIRES_CAPTURE and autoCapture is true', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent({ status: 'REQUIRES_CAPTURE' });
      configHelper.getAutoCapture.mockReturnValue(true);

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(true);
      expect(paymentIntent.capture).toHaveBeenCalled();
      expect(orderHelper.updateOrderPayment).toHaveBeenCalled();
    });

    it('skips auto-capture when autoCapture is false', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent({ status: 'REQUIRES_CAPTURE' });
      configHelper.getAutoCapture.mockReturnValue(false);

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(true);
      expect(paymentIntent.capture).not.toHaveBeenCalled();
      expect(orderHelper.updateOrderPaymentStatus).toHaveBeenCalledWith(mockOrder, 'REQUIRES_CAPTURE');
    });

    it('returns false and fails order on unexpected error', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      orderHelper.setPaymentIntentId.mockImplementationOnce(() => {
        throw new Error('Update failed');
      });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(false);
      expect(OrderMgr.failOrder).toHaveBeenCalledWith(mockOrder, true);
    });

    it('returns false and fails order when fraud detection returns fail', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      mockHooksHelper.mockReturnValue({ status: 'fail' });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(false);
      expect(OrderMgr.failOrder).toHaveBeenCalledWith(mockOrder, true);
      expect(logger.error).toHaveBeenCalledWith('Fraud detection failed', expect.any(Object));
    });

    it('sets CONFIRMATION_STATUS_NOTCONFIRMED when fraud detection returns flag', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      mockHooksHelper.mockReturnValue({ status: 'flag' });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(true);
      expect(mockOrder.confirmationStatus).toBe(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
    });

    it('sets CONFIRMATION_STATUS_CONFIRMED when fraud detection passes', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      mockHooksHelper.mockReturnValue({ status: 'pass' });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(true);
      expect(mockOrder.confirmationStatus).toBe(Order.CONFIRMATION_STATUS_CONFIRMED);
    });

    it('sets EXPORT_STATUS_READY after placing order', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      mockHooksHelper.mockReturnValue({ status: 'pass' });

      checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(mockOrder.exportStatus).toBe(Order.EXPORT_STATUS_READY);
    });

    it('returns false and fails order when placeOrder returns error status', () => {
      const mockOrder = OrderMgr.createOrder(createMockBasket());
      const paymentIntent = createMockPaymentIntent();
      mockHooksHelper.mockReturnValue({ status: 'pass' });
      OrderMgr.placeOrder.mockReturnValueOnce({ status: Status.ERROR });

      const result = checkoutService.finalizeOrder(mockOrder, paymentIntent);

      expect(result).toBe(false);
      expect(OrderMgr.failOrder).toHaveBeenCalledWith(mockOrder, true);
    });
  });

  // ===========================================================================
  // processPaymentReturn
  // ===========================================================================
  describe('processPaymentReturn', () => {
    beforeEach(() => {
      // fraud detection hook passes by default
      mockHooksHelper.mockReturnValue({ status: 'pass', error: false });
    });

    it('returns error when fraudDetectionStatus option is set', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();

      const result = checkoutService.processPaymentReturn(basket, paymentIntent, {
        fraudDetectionStatus: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('payment_failed');
      expect(OrderMgr.createOrder).not.toHaveBeenCalled();
    });

    it('returns error when payment intent amount does not match basket total', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent({ amount: 5000 });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('payment_failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Payment intent amount/currency mismatch with basket',
        expect.objectContaining({ intentAmount: 5000, basketTotal: 10000 }),
      );
    });

    it('returns error when payment intent currency does not match basket', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent({ currency: 'EUR' });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('payment_failed');
    });

    it('uses base_amount/base_currency for validation when available', () => {
      const basket = createMockBasket();
      basketHelper.getBasketTotal.mockReturnValue(8000);
      basketHelper.getBasketCurrency.mockReturnValue('AUD');
      const paymentIntent = createMockPaymentIntent({
        amount: 5000,
        currency: 'USD',
        baseAmount: 8000,
        baseCurrency: 'AUD',
      });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      // Should pass because baseAmount/baseCurrency match basket
      expect(result.success).toBe(true);
    });

    it('falls back to amount/currency when base values are not available', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent({
        amount: 10000,
        currency: 'USD',
        baseAmount: undefined,
        baseCurrency: undefined,
      });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(true);
    });

    it('creates order and returns success for valid payment', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it('uses reserved order number when available', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();
      basketHelper.getReservedOrderNo.mockReturnValue('RESERVED-123');

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(true);
      expect(OrderMgr.createOrder).toHaveBeenCalledWith(basket, 'RESERVED-123');
    });

    it('returns error when order creation fails', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();
      OrderMgr.createOrder.mockImplementationOnce(() => {
        throw new Error('Creation failed');
      });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('order_creation_failed');
    });

    it('returns error when finalization fails', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();
      orderHelper.setPaymentIntentId.mockImplementationOnce(() => {
        throw new Error('Failed');
      });

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('processing_error');
    });

    it('proceeds when fraudDetectionStatus option is falsy', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();

      const result = checkoutService.processPaymentReturn(basket, paymentIntent, {
        fraudDetectionStatus: false,
      });

      expect(result.success).toBe(true);
    });

    it('proceeds when options are not provided', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent();

      const result = checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(result.success).toBe(true);
    });

    it('logs warning when payment intent IDs do not match', () => {
      const basket = createMockBasket();
      const paymentIntent = createMockPaymentIntent({ id: 'int_different', amount: 10000, currency: 'USD' });
      basketHelper.getPaymentIntentId.mockReturnValue('int_stored');

      checkoutService.processPaymentReturn(basket, paymentIntent);

      expect(logger.warn).toHaveBeenCalledWith('PaymentIntent mismatch', {
        expected: 'int_stored',
        received: 'int_different',
      });
    });
  });
});
