export {};

jest.mock(
  '*/cartridge/scripts/util/collections',
  () => ({
    map: (items: unknown[], callback: (item: unknown) => unknown) => items.map(callback),
  }),
  { virtual: true },
);

jest.mock('dw/web/URLUtils', () => ({
  https: jest.fn(() => ({
    toString: () => 'https://shop.example/Airwallex-ReturnFromPayment',
  })),
}));

const Payment = require('../payment');

const createInstrument = (overrides: Record<string, unknown> = {}) => ({
  paymentMethod: 'AirwallexOnline',
  paymentTransaction: { amount: { value: 37.35 } },
  custom: {
    awxPaymentIntentId: 'int_123',
    awxPaymentIntentClientSecret: 'pi-secret-should-not-be-used',
    awxPaymentIntentCurrency: 'GBP',
    awxPaymentMethodType: 'card',
  },
  creditCardType: undefined,
  maskedCreditCardNumber: undefined,
  ...overrides,
});

describe('Payment model', () => {
  it('exposes the basket client secret on selected payment instruments', () => {
    const payment = new Payment(
      {
        custom: { awxPaymentIntentClientSecret: 'basket-secret' },
        paymentInstruments: [createInstrument()],
      },
      {},
      'GB',
    );

    expect(payment.selectedPaymentInstruments).toEqual([
      {
        paymentMethod: 'AirwallexOnline',
        amount: 37.35,
        awxPaymentIntentId: 'int_123',
        awxPaymentIntentClientSecret: 'basket-secret',
        awxCurrency: 'GBP',
        awxContinueUrl: 'https://shop.example/Airwallex-ReturnFromPayment',
        awxPaymentMethodType: 'card',
      },
    ]);
  });

  it('does not expose a client secret when the basket attribute is unavailable', () => {
    const payment = new Payment(
      {
        custom: {
          get awxPaymentIntentClientSecret(): string {
            throw new Error('Attribute not defined');
          },
        },
        paymentInstruments: [createInstrument()],
      },
      {},
      'GB',
    );

    expect(payment.selectedPaymentInstruments[0].awxPaymentIntentClientSecret).toBe('');
  });
});
