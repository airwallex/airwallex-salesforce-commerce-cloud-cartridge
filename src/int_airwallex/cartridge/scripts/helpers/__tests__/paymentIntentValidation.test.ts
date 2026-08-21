export {};

const mockGetById = jest.fn();
const mockCancel = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock(
  '../../airwallex/models/PaymentIntent',
  () => ({
    __esModule: true,
    default: {
      getById: mockGetById,
    },
  }),
  { virtual: true },
);
jest.mock(
  '../logger',
  () => ({
    __esModule: true,
    default: {
      warn: mockLoggerWarn,
    },
  }),
  { virtual: true },
);
jest.mock('dw/web/URLUtils', () => ({
  abs: jest.fn(() => ({
    toString: jest.fn(() => 'https://shop.example/Airwallex-ReturnFromPayment'),
  })),
}));

import basketHelper from '../basketHelper';
import paymentHelper from '../paymentHelper';
import {
  cleanupStalePaymentIntent,
  validateCardPaymentIntent,
  validatePaymentIntentState,
} from '../paymentIntentValidation';

interface TestBasket {
  UUID: string;
  custom: {
    awxPaymentIntentId: string;
    awxReservedOrderNo: string;
    awxPaymentIntentParamsFingerprint: string;
  };
  totalGrossPrice: {
    value: number;
    currencyCode: string;
  };
  currencyCode: string;
  customer: null;
  customerEmail: string;
  billingAddress: null;
  defaultShipment: null;
  productLineItems: never[];
}

const createBasket = (): TestBasket => ({
  UUID: 'basket-123',
  custom: {
    awxPaymentIntentId: 'int_123',
    awxReservedOrderNo: 'order-123',
    awxPaymentIntentParamsFingerprint: '',
  },
  totalGrossPrice: {
    value: 100,
    currencyCode: 'AUD',
  },
  currencyCode: 'AUD',
  customer: null,
  customerEmail: 'shopper@example.com',
  billingAddress: null,
  defaultShipment: null,
  productLineItems: [],
});

const createPaymentIntent = (overrides: Record<string, unknown> = {}) => ({
  id: 'int_123',
  clientSecret: 'secret_123',
  amount: 100,
  currency: 'AUD',
  status: 'REQUIRES_PAYMENT_METHOD',
  merchantOrderId: 'order-123',
  metadata: { basketId: 'basket-123' },
  latestPaymentAttempt: undefined,
  canCancel: false,
  cancel: mockCancel,
  ...overrides,
});

const prepareFingerprint = (basket: ReturnType<typeof createBasket>): void => {
  const params = {
    appName: 'credit_card',
    amount: 100,
    currency: 'AUD',
    orderId: 'order-123',
    returnUrl: 'https://shop.example/Airwallex-ReturnFromPayment',
    order: {
      type: 'physical_goods',
      products: [],
      shipping: undefined,
    },
    customer: undefined,
    metadata: { basketId: 'basket-123' },
  };
  basket.custom.awxPaymentIntentParamsFingerprint = basketHelper.buildPaymentIntentFingerprint(params);
};

describe('PaymentIntent live-state validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a PaymentIntent that matches canonical basket state', () => {
    const basket = createBasket();
    prepareFingerprint(basket);
    mockGetById.mockReturnValue(createPaymentIntent());
    jest.spyOn(paymentHelper, 'getBasketPaymentInstrument').mockReturnValue({
      custom: { awxPaymentIntentId: 'int_123' },
    } as never);

    const result = validateCardPaymentIntent(basket as never, 'int_123');

    expect(result.status).toBe('valid');
  });

  it('rejects a mismatched submitted intent before fetching Airwallex state', () => {
    const basket = createBasket();
    prepareFingerprint(basket);

    const result = validatePaymentIntentState(basket as never, 'credit_card', 'int_other');

    expect(result.status).toBe('stale');
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('rejects a mismatched fingerprint and loads the associated intent for best-effort cleanup', () => {
    const basket = createBasket();
    basket.custom.awxPaymentIntentParamsFingerprint = 'different-fingerprint';
    mockGetById.mockReturnValue(createPaymentIntent());

    const result = validatePaymentIntentState(basket as never, 'credit_card', 'int_123');

    expect(result.status).toBe('stale');
    expect(mockGetById).toHaveBeenCalledWith('int_123');
  });

  it('returns unavailable when fresh Airwallex state cannot be loaded', () => {
    const basket = createBasket();
    prepareFingerprint(basket);
    mockGetById.mockReturnValue(null);

    const result = validatePaymentIntentState(basket as never, 'credit_card', 'int_123');

    expect(result).toEqual({ status: 'unavailable', reason: 'payment_intent_unavailable' });
  });

  it.each([
    ['amount', { amount: 101 }],
    ['currency', { currency: 'USD' }],
    ['basket metadata', { metadata: { basketId: 'basket-other' } }],
    ['merchant order', { merchantOrderId: 'order-other' }],
    ['unsafe status', { status: 'PENDING' }],
    ['expired attempt', { latestPaymentAttempt: { status: 'EXPIRED' } }],
    ['failed attempt', { latestPaymentAttempt: { status: 'FAILED' } }],
    ['cancelled attempt', { latestPaymentAttempt: { status: 'CANCELLED' } }],
  ])('rejects a PaymentIntent with mismatched or unsafe %s', (_scenario, overrides) => {
    const basket = createBasket();
    prepareFingerprint(basket);
    mockGetById.mockReturnValue(createPaymentIntent(overrides));

    const result = validatePaymentIntentState(basket as never, 'credit_card', 'int_123');

    expect(result.status).toBe('stale');
  });

  it('rejects a card payment instrument associated with another intent', () => {
    const basket = createBasket();
    prepareFingerprint(basket);
    mockGetById.mockReturnValue(createPaymentIntent());
    jest.spyOn(paymentHelper, 'getBasketPaymentInstrument').mockReturnValue({
      custom: { awxPaymentIntentId: 'int_other' },
    } as never);

    const result = validateCardPaymentIntent(basket as never, 'int_123');

    expect(result).toEqual(expect.objectContaining({ status: 'stale', reason: 'payment_instrument_mismatch' }));
  });

  it('best-effort cancels supported stale intents and always detaches basket state', () => {
    const basket = createBasket();
    const paymentIntent = createPaymentIntent({ canCancel: true });
    jest.spyOn(basketHelper, 'clearAirwallexData');
    jest.spyOn(paymentHelper, 'removeBasketPaymentInstruments').mockImplementation(jest.fn());

    cleanupStalePaymentIntent(basket as never, 'AirwallexCreditCard', paymentIntent as never);

    expect(mockCancel).toHaveBeenCalledWith('stale_payment_intent');
    expect(basketHelper.clearAirwallexData).toHaveBeenCalledWith(basket);
    expect(paymentHelper.removeBasketPaymentInstruments).toHaveBeenCalledWith(basket, 'AirwallexCreditCard');
  });

  it('does not block stale cleanup when cancellation fails', () => {
    const basket = createBasket();
    const paymentIntent = createPaymentIntent({ canCancel: true });
    mockCancel.mockImplementation(() => {
      throw new Error('cancel unavailable');
    });
    jest.spyOn(basketHelper, 'clearAirwallexData');
    jest.spyOn(paymentHelper, 'removeBasketPaymentInstruments').mockImplementation(jest.fn());

    expect(() =>
      cleanupStalePaymentIntent(basket as never, 'AirwallexCreditCard', paymentIntent as never),
    ).not.toThrow();
    expect(basketHelper.clearAirwallexData).toHaveBeenCalledWith(basket);
    expect(paymentHelper.removeBasketPaymentInstruments).toHaveBeenCalledWith(basket, 'AirwallexCreditCard');
    expect(mockLoggerWarn).toHaveBeenCalled();
  });
});
