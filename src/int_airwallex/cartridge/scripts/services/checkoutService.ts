/**
 * Checkout Service - Handles order creation and payment finalization
 * Extracted from controller to keep controllers thin
 */

import PaymentIntent from '../airwallex/models/PaymentIntent';
import basketHelper from '../helpers/basketHelper';
import orderHelper from '../helpers/orderHelper';
import configHelper from '../helpers/configHelper';
import paymentHelper from '../helpers/paymentHelper';
import logger from '../helpers/logger';
import { PAYMENT_INTENT_STATUS } from '../constants/paymentStatus';
import { CHECKOUT_ERROR } from '../constants/errorCodes';
import Basket = require('dw/order/Basket');
import Order = require('dw/order/Order');
import OrderMgr = require('dw/order/OrderMgr');
import Transaction = require('dw/system/Transaction');
import PaymentMgr = require('dw/order/PaymentMgr');
import Resource = require('dw/web/Resource');
import Status = require('dw/system/Status');

// SFCC storefront base modules (ambient declarations in @types/module/index.d.ts)
import { validateProducts } from '*/cartridge/scripts/helpers/basketValidationHelpers';
import { calculatePaymentTransaction } from '*/cartridge/scripts/checkout/checkoutHelpers';
import { calculateTotals } from '*/cartridge/scripts/helpers/basketCalculationHelpers';
import hooksHelper = require('*/cartridge/scripts/helpers/hooks');
import { validateOrder } from '*/cartridge/scripts/hooks/validateOrder';
import { fraudDetection } from '*/cartridge/scripts/hooks/fraudDetection';

/**
 * Result of processing a payment return
 */
interface ProcessReturnResult {
  success: boolean;
  order?: Order;
  error?: string;
}

/**
 * Result of order creation including validation
 */
interface CreateOrderResult {
  success: boolean;
  order?: Order;
  errorMessage?: string;
  errorStage?: {
    stage: string;
    step: string;
  };
}

/**
 * Create order from basket with full SFCC validation
 * Replicates the validation logic from the base SFCC PlaceOrder controller:
 * 1. Validate products in basket
 * 2. Validate order via hook
 * 3. Check shipping address exists
 * 4. Check billing address exists
 * 5. Calculate basket totals
 * 6. Calculate payment transaction
 * 7. Create the order
 *
 * @param basket - The current basket
 * @param reservedOrderNo - Optional pre-reserved order number
 * @returns Result with order on success or error details on failure
 */
const createOrder = (basket: Basket, reservedOrderNo?: string): CreateOrderResult => {
  // Ensure basket contains an Airwallex payment instrument
  if (!basketHelper.hasAirwallexPaymentInstrument(basket)) {
    logger.error('Basket does not contain an Airwallex payment instrument');
    return {
      success: false,
      errorMessage: 'No Airwallex payment instrument found on basket',
    };
  }

  // Validate products in basket
  const validatedProducts = validateProducts(basket);
  if (validatedProducts.error) {
    logger.error('Basket product validation failed');
    return {
      success: false,
      errorMessage: Resource.msg('error.technical', 'checkout', null as unknown as string),
    };
  }

  // Validate order via hook
  const validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', basket, validateOrder);
  if (validationOrderStatus.error) {
    logger.error('Order validation failed', { message: validationOrderStatus.message });
    return {
      success: false,
      errorMessage: validationOrderStatus.message,
    };
  }

  // Check shipping address exists
  if (basket.defaultShipment.shippingAddress === null) {
    logger.error('No shipping address on basket');
    return {
      success: false,
      errorStage: { stage: 'shipping', step: 'address' },
      errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null as unknown as string),
    };
  }

  // Check billing address exists
  if (!basket.billingAddress) {
    logger.error('No billing address on basket');
    return {
      success: false,
      errorStage: { stage: 'payment', step: 'billingAddress' },
      errorMessage: Resource.msg('error.no.billing.address', 'checkout', null as unknown as string),
    };
  }

  // Calculate basket totals
  Transaction.wrap(() => {
    calculateTotals(basket);
  });

  // Calculate payment transaction
  const calculatedPaymentTransaction = calculatePaymentTransaction(basket);
  if (calculatedPaymentTransaction.error) {
    logger.error('Payment transaction calculation failed');
    return {
      success: false,
      errorMessage: Resource.msg('error.technical', 'checkout', null as unknown as string),
    };
  }

  // Create the order
  let order: Order | null = null;
  try {
    order = Transaction.wrap(() => {
      if (reservedOrderNo) {
        return OrderMgr.createOrder(basket, reservedOrderNo);
      }
      return OrderMgr.createOrder(basket);
    });
  } catch (e) {
    logger.error('Failed to create order', { error: e });
    return {
      success: false,
      errorMessage: Resource.msg('error.technical', 'checkout', null as unknown as string),
    };
  }

  if (!order) {
    return {
      success: false,
      errorMessage: Resource.msg('error.technical', 'checkout', null as unknown as string),
    };
  }

  if (!reservedOrderNo) {
    logger.info('Order created without reserved order number', {
      basketId: basket.UUID,
      orderNo: order.orderNo,
    });
  }

  return {
    success: true,
    order,
  };
};

/**
 * Finalize order after successful payment
 * Updates payment data, handles auto-capture, places order
 * @param order - The order to finalize
 * @param paymentIntent - The PaymentIntent from Airwallex
 * @returns true if order was successfully finalized
 */
const finalizeOrder = (order: Order, paymentIntent: InstanceType<typeof PaymentIntent>): boolean => {
  try {
    const paymentInstruments = order.getPaymentInstruments();
    const paymentInstrument = paymentInstruments.length > 0 ? paymentInstruments[0] : null;
    if (paymentInstrument) {
      const paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;
      Transaction.wrap(() => {
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
      });
    }

    // Update order with payment data
    orderHelper.setPaymentIntentId(order, paymentIntent.id);
    orderHelper.setPaymentStatus(order, paymentIntent.status);
    orderHelper.updatePaymentMethodInformation(order, paymentIntent);

    // Handle auto-capture if needed
    let finalPaymentIntent = paymentIntent;
    if (paymentIntent.status === PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE) {
      const autoCapture = configHelper.getAutoCapture();
      if (autoCapture) {
        logger.info('Auto-capturing payment', { paymentIntentId: paymentIntent.id });
        const capturedPi = paymentIntent.capture();
        if (capturedPi) {
          finalPaymentIntent = capturedPi;
        }
      }
    }

    orderHelper.updateOrderPayment(
      order,
      finalPaymentIntent.id,
      finalPaymentIntent.status,
      finalPaymentIntent.id,
      finalPaymentIntent.capturedAmount,
    );
    paymentHelper.updatePaymentInstrumentTransaction(
      paymentInstrument,
      finalPaymentIntent.id,
      finalPaymentIntent.capturedAmount,
      finalPaymentIntent.currency,
    );
    orderHelper.updateOrderPaymentStatus(order, finalPaymentIntent.status);

    // Fraud detection hook (replicates base SFCC PlaceOrder)
    const fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', order, fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
      logger.error('Fraud detection failed', { orderNo: order.orderNo });
      return false;
    }

    // Place the order, set confirmation and export status
    // Replicates COHelpers.placeOrder from base SFCC
    try {
      Transaction.begin();
      const placeOrderStatus = OrderMgr.placeOrder(order);
      if (placeOrderStatus.status === Status.ERROR) {
        throw new Error('OrderMgr.placeOrder returned error status');
      }

      if (fraudDetectionStatus.status === 'flag') {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
      } else {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
      }
      order.setExportStatus(Order.EXPORT_STATUS_READY);
      Transaction.commit();
    } catch (placeError) {
      Transaction.rollback();
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
      logger.error('Failed to place order', { orderNo: order.orderNo, error: placeError });
      return false;
    }

    logger.info('Order placed successfully', { orderNo: order.orderNo });
    return true;
  } catch (e) {
    logger.error('Failed to finalize order', { orderNo: order.orderNo, error: e });
    try {
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
    } catch (failError) {
      logger.error('Failed to fail order after finalization error', { orderNo: order.orderNo, error: failError });
    }
    return false;
  }
};

/**
 * Process payment return from redirect-based payments
 * Called when customer returns from Alipay, bank redirect, etc.
 * @param basket - The current basket
 * @param paymentIntent - The PaymentIntent retrieved from Airwallex
 * @returns Result with order on success or error message on failure
 */
const processPaymentReturn = (
  basket: Basket,
  paymentIntent: InstanceType<typeof PaymentIntent>,
  options?: { fraudDetectionStatus?: boolean },
): ProcessReturnResult => {
  // Guard against repeated submissions after prior fraud detection failure
  if (options?.fraudDetectionStatus) {
    logger.error('Fraud detection status flag is set, blocking order creation');
    return {
      success: false,
      error: CHECKOUT_ERROR.PAYMENT_FAILED,
    };
  }

  // Verify payment intent matches the one stored on basket
  const storedPiId = basketHelper.getPaymentIntentId(basket);
  if (storedPiId && storedPiId !== paymentIntent.id) {
    logger.warn('PaymentIntent mismatch', {
      expected: storedPiId,
      received: paymentIntent.id,
    });
  }

  // Validate payment intent amount matches basket total to prevent tampering
  // Prefer base_amount/base_currency (settlement values) when available
  const intentAmount = paymentIntent.baseAmount ?? paymentIntent.amount;
  const intentCurrency = paymentIntent.baseCurrency ?? paymentIntent.currency;
  const basketTotal = basketHelper.getBasketTotal(basket);
  const basketCurrency = basketHelper.getBasketCurrency(basket);
  if (intentAmount !== basketTotal || intentCurrency !== basketCurrency) {
    logger.error('Payment intent amount/currency mismatch with basket', {
      intentAmount,
      basketTotal,
      intentCurrency,
      basketCurrency,
      paymentIntentId: paymentIntent.id,
    });
    return {
      success: false,
      error: CHECKOUT_ERROR.PAYMENT_FAILED,
    };
  }

  // Get reserved order number (for Drop-in flow)
  const reservedOrderNo = basketHelper.getReservedOrderNo(basket);

  // Create the order (includes basket validation)
  const createResult = createOrder(basket, reservedOrderNo || undefined);

  if (!createResult.success || !createResult.order) {
    logger.error('Order creation failed', { errorMessage: createResult.errorMessage });
    return {
      success: false,
      error: CHECKOUT_ERROR.ORDER_CREATION_FAILED,
    };
  }

  const order = createResult.order;

  // Finalize the order with payment data
  const finalized = finalizeOrder(order, paymentIntent);

  if (!finalized) {
    return {
      success: false,
      error: CHECKOUT_ERROR.PROCESSING_ERROR,
    };
  }

  // Clear basket payment data
  basketHelper.clearAirwallexData(basket);

  return {
    success: true,
    order,
  };
};

const checkoutService = {
  createOrder,
  finalizeOrder,
  processPaymentReturn,
};

module.exports = checkoutService;
export default checkoutService;
export { createOrder, finalizeOrder, processPaymentReturn, ProcessReturnResult, CreateOrderResult };
