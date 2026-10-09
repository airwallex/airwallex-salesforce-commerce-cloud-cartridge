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

type PaymentIntentModel = InstanceType<typeof PaymentIntent>;

const firstPaymentInstrument = (order: Order) => {
  const paymentInstruments = order.getPaymentInstruments();
  return paymentInstruments.length > 0 ? paymentInstruments[0] : null;
};

const assignPaymentProcessor = (order: Order): void => {
  const paymentInstrument = firstPaymentInstrument(order);
  if (!paymentInstrument) {
    return;
  }
  const paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;
  Transaction.wrap(() => {
    paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
  });
};

/**
 * Finalize order after payment.
 * awaitingPayment leaves the order placed but unconfirmed and not export-ready
 * until a later success webhook. Otherwise the order is confirmed and export-ready,
 * unless fraud detection flags it.
 */
const finalizeOrder = (
  order: Order,
  paymentIntent: PaymentIntentModel,
  options?: { awaitingPayment?: boolean },
): boolean => {
  const awaitingPayment = options?.awaitingPayment === true;
  try {
    assignPaymentProcessor(order);
    orderHelper.setPaymentIntentId(order, paymentIntent.id);
    orderHelper.setPaymentStatus(order, paymentIntent.status);
    orderHelper.updatePaymentMethodInformation(order, paymentIntent);

    let finalPaymentIntent = paymentIntent;
    if (!awaitingPayment && paymentIntent.status === PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE) {
      const autoCapture = configHelper.getAutoCapture();
      if (autoCapture) {
        logger.info('Auto-capturing payment', { paymentIntentId: paymentIntent.id });
        const capturedPi = paymentIntent.capture();
        if (capturedPi) {
          finalPaymentIntent = capturedPi;
        }
      }
    }

    const paymentInstrument = firstPaymentInstrument(order);
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

    const fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', order, fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
      logger.error('Fraud detection failed', { orderNo: order.orderNo });
      return false;
    }

    try {
      Transaction.begin();
      const placeOrderStatus = OrderMgr.placeOrder(order);
      if (placeOrderStatus.status === Status.ERROR) {
        throw new Error('OrderMgr.placeOrder returned error status');
      }

      if (awaitingPayment || fraudDetectionStatus.status === 'flag') {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
      } else {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
      }
      order.setExportStatus(awaitingPayment ? Order.EXPORT_STATUS_NOTEXPORTED : Order.EXPORT_STATUS_READY);
      Transaction.commit();
    } catch (placeError) {
      Transaction.rollback();
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
      logger.error(awaitingPayment ? 'Failed to place pending order' : 'Failed to place order', {
        orderNo: order.orderNo,
        error: placeError,
      });
      return false;
    }

    logger.info(
      awaitingPayment ? 'Pending order placed, waiting for payment confirmation' : 'Order placed successfully',
      { orderNo: order.orderNo },
    );
    return true;
  } catch (e) {
    logger.error(awaitingPayment ? 'Failed to place pending order' : 'Failed to finalize order', {
      orderNo: order.orderNo,
      error: e,
    });
    try {
      Transaction.wrap(() => {
        OrderMgr.failOrder(order, true);
      });
    } catch (failError) {
      logger.error(
        awaitingPayment
          ? 'Failed to fail order after pending placement error'
          : 'Failed to fail order after finalization error',
        { orderNo: order.orderNo, error: failError },
      );
    }
    return false;
  }
};

/**
 * Shared guards for a shopper returning from a redirect payment.
 * @returns An error result when the return must stop, otherwise null
 */
const validatePaymentReturn = (
  basket: Basket,
  paymentIntent: PaymentIntentModel,
  options?: { fraudDetectionStatus?: boolean },
): ProcessReturnResult | null => {
  if (options?.fraudDetectionStatus) {
    logger.error('Fraud detection status flag is set, blocking order creation');
    return {
      success: false,
      error: CHECKOUT_ERROR.PAYMENT_FAILED,
    };
  }

  const storedPiId = basketHelper.getPaymentIntentId(basket);
  if (storedPiId && storedPiId !== paymentIntent.id) {
    logger.warn('PaymentIntent mismatch', {
      expected: storedPiId,
      received: paymentIntent.id,
    });
  }

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

  return null;
};

/**
 * Process payment return from redirect-based payments.
 * awaitingPayment accepts REQUIRES_CUSTOMER_ACTION and leaves the order unconfirmed.
 */
const processPaymentReturnForStatus = (
  basket: Basket,
  paymentIntent: PaymentIntentModel,
  options: { fraudDetectionStatus?: boolean } | undefined,
  awaitingPayment: boolean,
): ProcessReturnResult => {
  const invalid = validatePaymentReturn(basket, paymentIntent, options);
  if (invalid) {
    return invalid;
  }

  const statusAccepted = awaitingPayment
    ? paymentIntent.status === PAYMENT_INTENT_STATUS.REQUIRES_CUSTOMER_ACTION
    : paymentIntent.status === PAYMENT_INTENT_STATUS.SUCCEEDED ||
      paymentIntent.status === PAYMENT_INTENT_STATUS.REQUIRES_CAPTURE;
  if (!statusAccepted) {
    logger.info(
      awaitingPayment
        ? 'PaymentIntent is not waiting on customer action'
        : 'PaymentIntent is not ready to place an order',
      {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      },
    );
    return {
      success: false,
      error: CHECKOUT_ERROR.PAYMENT_FAILED,
    };
  }

  const reservedOrderNo = basketHelper.getReservedOrderNo(basket);
  const createResult = createOrder(basket, reservedOrderNo || undefined);
  if (!createResult.success || !createResult.order) {
    logger.error('Order creation failed', { errorMessage: createResult.errorMessage });
    return {
      success: false,
      error: CHECKOUT_ERROR.ORDER_CREATION_FAILED,
    };
  }

  const finalized = finalizeOrder(
    createResult.order,
    paymentIntent,
    awaitingPayment ? { awaitingPayment: true } : undefined,
  );
  if (!finalized) {
    return {
      success: false,
      error: CHECKOUT_ERROR.PROCESSING_ERROR,
    };
  }

  basketHelper.clearAirwallexData(basket);
  return {
    success: true,
    order: createResult.order,
  };
};

const processPaymentReturn = (
  basket: Basket,
  paymentIntent: PaymentIntentModel,
  options?: { fraudDetectionStatus?: boolean },
): ProcessReturnResult => processPaymentReturnForStatus(basket, paymentIntent, options, false);

/**
 * Create a pending order when a redirect wallet has finished but Airwallex
 * still reports REQUIRES_CUSTOMER_ACTION. Fulfillment waits for the success webhook.
 */
const processPendingPaymentReturn = (
  basket: Basket,
  paymentIntent: PaymentIntentModel,
  options?: { fraudDetectionStatus?: boolean },
): ProcessReturnResult => processPaymentReturnForStatus(basket, paymentIntent, options, true);

const checkoutService = {
  createOrder,
  finalizeOrder,
  processPaymentReturn,
  processPendingPaymentReturn,
};

module.exports = checkoutService;
export default checkoutService;
export {
  createOrder,
  finalizeOrder,
  processPaymentReturn,
  processPendingPaymentReturn,
  ProcessReturnResult,
  CreateOrderResult,
};
