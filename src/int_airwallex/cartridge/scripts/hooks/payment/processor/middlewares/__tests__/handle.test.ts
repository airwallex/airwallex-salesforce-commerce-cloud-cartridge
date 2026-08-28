export {};

import type { PaymentInformation } from '../../types';

jest.mock(
  '@/cartridge/scripts/airwallex/models/PaymentIntent',
  () => ({
    __esModule: true,
    default: {
      create: jest.fn(),
      getById: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/logger',
  () => ({
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/basketHelper',
  () => ({
    __esModule: true,
    default: {
      buildCustomerDetails: jest.fn(),
      buildOrderObject: jest.fn(),
      buildPaymentIntentFingerprint: jest.fn(),
      getBasketCurrency: jest.fn(),
      getBasketTotal: jest.fn(),
      getParamsFingerprint: jest.fn(),
      getPaymentIntentId: jest.fn(),
      getReservedOrderNo: jest.fn(),
      setParamsFingerprint: jest.fn(),
      setPaymentIntentId: jest.fn(),
      setReservedOrderNo: jest.fn(),
      setClientSecret: jest.fn(),
      clearAirwallexData: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentIntentValidation',
  () => ({
    buildPaymentIntentCreateParams: jest.fn(),
    cleanupStalePaymentIntent: jest.fn(),
    validatePaymentIntentState: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/helpers/paymentHelper',
  () => ({
    __esModule: true,
    default: {
      createBasketPaymentInstrument: jest.fn(),
      getBasketPaymentInstrument: jest.fn(),
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/appConfig',
  () => ({
    APP_NAME: {
      APM: 'payment_plugin_salesforce_apm',
      CARD: 'payment_plugin_salesforce_card',
      APPLE_PAY: 'applepay',
      GOOGLE_PAY: 'googlepay',
    },
    isExpressAppName: (value: unknown) => value === 'applepay' || value === 'googlepay',
    PAYMENT_METHOD_ID: {
      APM: 'AirwallexOnline',
      CARD: 'AirwallexCreditCard',
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/constants/paymentStatus',
  () => ({
    PAYMENT_INTENT_STATUS: {
      REQUIRES_PAYMENT_METHOD: 'REQUIRES_PAYMENT_METHOD',
    },
  }),
  { virtual: true },
);
jest.mock('dw/order/OrderMgr', () => ({ createOrderNo: jest.fn() }));
jest.mock('dw/system/Transaction', () => ({ wrap: jest.fn((callback: () => void) => callback()) }));
jest.mock('dw/web/URLUtils', () => ({
  abs: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    toString: jest.fn(() => 'https://shop.example/return'),
  })),
}));

const PaymentIntent = require('@/cartridge/scripts/airwallex/models/PaymentIntent').default;
const basketHelper = require('@/cartridge/scripts/helpers/basketHelper').default;
const paymentHelper = require('@/cartridge/scripts/helpers/paymentHelper').default;
const paymentIntentValidation = require('@/cartridge/scripts/helpers/paymentIntentValidation');
const OrderMgr = require('dw/order/OrderMgr');
const { handle } = require('../handle');

const basket = { UUID: 'basket-123', getUUID: () => 'basket-123' };
const cachedPaymentIntent = {
  id: 'int_cached',
  clientSecret: 'secret_cached',
  currency: 'AUD',
  status: 'REQUIRES_PAYMENT_METHOD',
  isFinalState: false,
};

describe('payment handle middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    basketHelper.getPaymentIntentId.mockReturnValue(cachedPaymentIntent.id);
    basketHelper.getParamsFingerprint.mockReturnValue('same-fingerprint');
    basketHelper.getReservedOrderNo.mockReturnValue('order-123');
    basketHelper.buildPaymentIntentFingerprint.mockReturnValue('same-fingerprint');
    basketHelper.getBasketTotal.mockReturnValue(100);
    basketHelper.getBasketCurrency.mockReturnValue('AUD');
    PaymentIntent.getById.mockReturnValue(cachedPaymentIntent);
    PaymentIntent.create.mockReturnValue({
      id: 'int_new',
      clientSecret: 'secret_new',
      currency: 'AUD',
    });
    paymentIntentValidation.validatePaymentIntentState.mockReturnValue({
      status: 'valid',
      paymentIntent: cachedPaymentIntent,
    });
    paymentIntentValidation.buildPaymentIntentCreateParams.mockReturnValue({
      appName: 'credit_card',
      amount: 100,
      currency: 'AUD',
      orderId: 'order-new',
    });
    OrderMgr.createOrderNo.mockReturnValue('order-new');
  });

  it('recreates a missing payment instrument when reusing a cached PaymentIntent', () => {
    paymentHelper.getBasketPaymentInstrument.mockReturnValue(null);

    const result = handle(basket, {}, 'AirwallexCreditCard');

    expect(result.error).toBe(false);
    expect(paymentHelper.createBasketPaymentInstrument).toHaveBeenCalledWith(
      basket,
      100,
      'AirwallexCreditCard',
      cachedPaymentIntent,
    );
    expect(basketHelper.setClientSecret).toHaveBeenCalledWith(basket, 'secret_cached');
  });

  it('does not duplicate an existing payment instrument when reusing a cached PaymentIntent', () => {
    paymentHelper.getBasketPaymentInstrument.mockReturnValue({ paymentMethod: 'AirwallexCreditCard' });

    const result = handle(basket, {}, 'AirwallexCreditCard');

    expect(result.error).toBe(false);
    expect(paymentHelper.createBasketPaymentInstrument).not.toHaveBeenCalled();
    expect(basketHelper.setClientSecret).toHaveBeenCalledWith(basket, 'secret_cached');
  });

  it('recreates a missing LPM instrument when reusing a cached PaymentIntent', () => {
    paymentHelper.getBasketPaymentInstrument.mockReturnValue(null);

    const result = handle(basket, {}, 'AirwallexOnline');

    expect(result.error).toBe(false);
    expect(paymentHelper.createBasketPaymentInstrument).toHaveBeenCalledWith(
      basket,
      100,
      'AirwallexOnline',
      cachedPaymentIntent,
    );
    expect(basketHelper.setClientSecret).toHaveBeenCalledWith(basket, 'secret_cached');
  });

  it.each([
    ['AirwallexCreditCard', 'payment_plugin_salesforce_card'],
    ['AirwallexOnline', 'payment_plugin_salesforce_apm'],
  ])('uses the existing app name for %s without an express discriminator', (paymentMethodId, appName) => {
    handle(basket, {}, paymentMethodId);

    expect(paymentIntentValidation.validatePaymentIntentState).toHaveBeenCalledWith(
      basket,
      appName,
      cachedPaymentIntent.id,
    );
  });

  it.each([
    ['applepay', 'applepay'],
    ['googlepay', 'googlepay'],
  ] as const)('uses the %s app name for express checkout', (expressPaymentMethod, appName) => {
    handle(basket, { expressPaymentMethod }, 'AirwallexOnline');

    expect(paymentIntentValidation.validatePaymentIntentState).toHaveBeenCalledWith(
      basket,
      appName,
      cachedPaymentIntent.id,
    );
  });

  it('rejects an invalid express payment method before validating or creating a PaymentIntent', () => {
    const paymentInformation = {
      expressPaymentMethod: 'unsupported-wallet',
    } as unknown as PaymentInformation;

    const result = handle(basket, paymentInformation, 'AirwallexOnline');

    expect(result.error).toBe(true);
    expect(paymentIntentValidation.validatePaymentIntentState).not.toHaveBeenCalled();
    expect(PaymentIntent.create).not.toHaveBeenCalled();
  });

  it('cleans stale state before creating one replacement PaymentIntent', () => {
    paymentIntentValidation.validatePaymentIntentState.mockReturnValue({
      status: 'stale',
      reason: 'amount_mismatch',
      paymentIntent: cachedPaymentIntent,
    });
    paymentHelper.getBasketPaymentInstrument.mockReturnValue(null);

    const result = handle(basket, {}, 'AirwallexCreditCard');

    expect(result.error).toBe(false);
    expect(paymentIntentValidation.cleanupStalePaymentIntent).toHaveBeenCalledWith(
      basket,
      'AirwallexCreditCard',
      cachedPaymentIntent,
    );
    expect(PaymentIntent.create).toHaveBeenCalledTimes(1);
    expect(basketHelper.setClientSecret).toHaveBeenCalledWith(basket, 'secret_new');
  });

  it('fails closed without creating a duplicate when validation is unavailable', () => {
    paymentIntentValidation.validatePaymentIntentState.mockReturnValue({
      status: 'unavailable',
      reason: 'payment_intent_unavailable',
    });

    const result = handle(basket, {}, 'AirwallexCreditCard');

    expect(result.error).toBe(true);
    expect(PaymentIntent.create).not.toHaveBeenCalled();
    expect(paymentIntentValidation.cleanupStalePaymentIntent).not.toHaveBeenCalled();
    expect(basketHelper.setClientSecret).not.toHaveBeenCalled();
  });

  it('fails closed without replacing an intent that has progressed beyond payment method collection', () => {
    paymentIntentValidation.validatePaymentIntentState.mockReturnValue({
      status: 'stale',
      reason: 'unsafe_status',
      paymentIntent: {
        ...cachedPaymentIntent,
        status: 'PENDING',
      },
    });

    const result = handle(basket, {}, 'AirwallexCreditCard');

    expect(result.error).toBe(true);
    expect(PaymentIntent.create).not.toHaveBeenCalled();
    expect(paymentIntentValidation.cleanupStalePaymentIntent).not.toHaveBeenCalled();
    expect(basketHelper.setClientSecret).not.toHaveBeenCalled();
  });
});
