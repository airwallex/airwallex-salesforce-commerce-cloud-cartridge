// Mock for dw/order/Order
// This file is used by Jest's moduleNameMapper to resolve dw/order/Order

class MockOrder {
  constructor(data = {}) {
    this.orderNo = data.orderNo || 'ORDER-001';
    this.UUID = data.UUID || 'order-uuid-123';
    this.totalGrossPrice = data.totalGrossPrice || {
      value: 100.0,
      currencyCode: 'USD',
    };
    this.custom = data.custom || {};
    this.paymentStatus = data.paymentStatus || MockOrder.PAYMENT_STATUS_NOTPAID;
    this.status = data.status || 0;
    this._paymentInstruments = data.paymentInstruments || [];
  }

  /**
   * Get all payment instruments or filter by payment method ID
   * @param {string} [paymentMethodId] - Optional payment method ID to filter by
   * @returns {Array} Array of payment instruments
   */
  getPaymentInstruments(paymentMethodId) {
    if (paymentMethodId) {
      return this._paymentInstruments.filter(pi => pi.paymentMethod === paymentMethodId);
    }
    return [...this._paymentInstruments];
  }

  /**
   * Create a payment instrument on the order
   * @param {string} paymentMethodId - The payment method ID
   * @param {Object} amount - The amount (Money object)
   * @returns {Object} The created payment instrument
   */
  createPaymentInstrument(paymentMethodId, amount) {
    const paymentInstrument = {
      paymentMethod: paymentMethodId,
      amount: amount,
      custom: {},
      paymentTransaction: {
        setTransactionID: jest.fn(),
        setAmount: jest.fn(),
        setType: jest.fn(),
        setPaymentProcessor: jest.fn(),
        transactionID: null,
        amount: null,
        type: null,
        paymentProcessor: null,
      },
      setCreditCardType: jest.fn(),
      setCreditCardNumber: jest.fn(),
    };
    this._paymentInstruments.push(paymentInstrument);
    return paymentInstrument;
  }

  /**
   * Remove a payment instrument from the order
   * @param {Object} paymentInstrument - The payment instrument to remove
   */
  removePaymentInstrument(paymentInstrument) {
    const index = this._paymentInstruments.indexOf(paymentInstrument);
    if (index > -1) {
      this._paymentInstruments.splice(index, 1);
    }
  }

  /**
   * Set the payment status on the order
   * @param {number} status - The payment status
   */
  setPaymentStatus(status) {
    this.paymentStatus = status;
  }

  /**
   * Set the order status
   * @param {number} status - The order status
   */
  setStatus(status) {
    this.status = status;
  }

  /**
   * Track order change
   * @param {string} message - The change message
   */
  setConfirmationStatus(status) {
    this.confirmationStatus = status;
  }

  setExportStatus(status) {
    this.exportStatus = status;
  }

  getCustomerEmail() {
    return this.customerEmail || null;
  }

  trackOrderChange(message) {
    // Mock implementation - in real SFCC this would track order history
    if (!this._orderChanges) {
      this._orderChanges = [];
    }
    this._orderChanges.push(message);
  }
}

// Static constants for payment status
MockOrder.PAYMENT_STATUS_PAID = 1;
MockOrder.PAYMENT_STATUS_NOTPAID = 0;
MockOrder.PAYMENT_STATUS_PARTPAID = 2;

// Static constants for confirmation status
MockOrder.CONFIRMATION_STATUS_CONFIRMED = 2;
MockOrder.CONFIRMATION_STATUS_NOTCONFIRMED = 1;

// Static constants for export status
MockOrder.EXPORT_STATUS_READY = 1;
MockOrder.EXPORT_STATUS_NOTEXPORTED = 0;
MockOrder.EXPORT_STATUS_EXPORTED = 2;

module.exports = MockOrder;
