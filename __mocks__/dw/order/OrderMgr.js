// Mock for dw/order/OrderMgr
// This file is used by Jest's moduleNameMapper to resolve dw/order/OrderMgr

const MockOrder = require('./Order');

// In-memory storage for orders
const orders = new Map();
let orderNumberCounter = 1;

/**
 * Generate a unique order number
 */
const generateOrderNo = () => {
  return `ORDER-${String(orderNumberCounter++).padStart(3, '0')}`;
};

/**
 * Create a mock order from basket data
 */
const createMockOrderFromBasket = (basket, orderNo) => {
  const orderData = {
    orderNo: orderNo || generateOrderNo(),
    UUID: `order-uuid-${Date.now()}-${Math.random()}`,
    totalGrossPrice: (basket && basket.totalGrossPrice) || {
      value: 0,
      currencyCode: 'USD',
    },
    custom: {},
    paymentStatus: MockOrder.PAYMENT_STATUS_NOTPAID,
    status: 0,
    paymentInstruments: [],
    orderToken: `token-${Date.now()}-${Math.random()}`,
  };
  return new MockOrder(orderData);
};

module.exports = {
  /**
   * Get order by order number
   * @param {string} orderNo - The order number
   * @param {string} [orderToken] - Optional order token for validation
   * @returns {MockOrder|null} The order or null if not found
   */
  getOrder: jest.fn((orderNo, orderToken) => {
    if (!orderNo) {
      return null;
    }

    const order = orders.get(orderNo);
    if (!order) {
      const order = createMockOrderFromBasket({}, orderNo);
      orders.set(orderNo, order);
      return order;
    }
    return order;
  }),

  /**
   * Create an order from a basket
   * @param {Object} basket - The basket to create order from
   * @param {string} [reservedOrderNo] - Optional reserved order number
   * @returns {MockOrder} The created order
   */
  createOrder: jest.fn((basket, reservedOrderNo) => {
    const orderNo = reservedOrderNo || generateOrderNo();
    const order = createMockOrderFromBasket(basket, orderNo);
    orders.set(orderNo, order);
    return order;
  }),

  /**
   * Create/reserve an order number
   * @returns {string} The reserved order number
   */
  createOrderNo: jest.fn(() => {
    return generateOrderNo();
  }),

  /**
   * Place/finalize an order
   * @param {MockOrder} order - The order to place
   * @returns {boolean} True if successful
   */
  placeOrder: jest.fn(order => {
    if (!order) {
      return { status: 1 }; // Status.ERROR
    }

    // Update order status to indicate it's been placed
    if (order.setStatus) {
      order.setStatus(1); // Assuming 1 means placed
    }

    // Ensure order is stored
    if (order.orderNo) {
      orders.set(order.orderNo, order);
    }

    return { status: 0 }; // Status.OK
  }),

  /**
   * Fail an order
   * @param {MockOrder} order - The order to fail
   * @param {boolean} [undoPayments] - Whether to undo payment authorizations
   * @returns {boolean} True if successful
   */
  failOrder: jest.fn((order, undoPayments) => {
    if (order && order.setStatus) {
      order.setStatus(8); // FAILED status
    }
    return true;
  }),

  // Test helpers
  /**
   * Reset the mock state (clears all orders and resets counter)
   */
  _reset: () => {
    orders.clear();
    orderNumberCounter = 1;
  },

  /**
   * Add an order directly to the mock storage (for testing)
   * @param {Object} orderData - Order data
   * @returns {MockOrder} The created order
   */
  _addOrder: orderData => {
    const order = new MockOrder(orderData);
    if (order.orderNo) {
      orders.set(order.orderNo, order);
    }
    return order;
  },

  /**
   * Get all stored orders (for testing)
   * @returns {Map} Map of all orders
   */
  _getOrders: () => orders,

  /**
   * Remove an order (for testing)
   * @param {string} orderNo - Order number to remove
   */
  _removeOrder: orderNo => {
    orders.delete(orderNo);
  },
};
