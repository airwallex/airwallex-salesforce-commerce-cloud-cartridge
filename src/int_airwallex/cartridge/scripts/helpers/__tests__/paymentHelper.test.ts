export {};

jest.mock('dw/system/Transaction', () => ({
  wrap: jest.fn((callback: () => void) => callback()),
}));

import paymentHelper from '../paymentHelper';

const createBasket = () => {
  const paymentInstrument = {
    custom: {} as Record<string, string>,
  };

  return {
    totalGrossPrice: { value: 37.35, currencyCode: 'GBP' },
    removeAllPaymentInstruments: jest.fn(),
    createPaymentInstrument: jest.fn(() => paymentInstrument),
    paymentInstrument,
  };
};

describe('paymentHelper.createBasketPaymentInstrument', () => {
  it('stores payment intent id and currency without the client secret', () => {
    const basket = createBasket();
    const paymentIntent = {
      id: 'int_sgpv6gphmhlhd7c440r',
      clientSecret: 'eyJraWQiOiJzZWNyZXQifQ',
      currency: 'GBP',
    };

    const paymentInstrument = paymentHelper.createBasketPaymentInstrument(
      basket as never,
      37.35,
      'AirwallexCreditCard',
      paymentIntent as never,
    );

    expect(basket.removeAllPaymentInstruments).toHaveBeenCalled();
    expect(basket.createPaymentInstrument).toHaveBeenCalledWith('AirwallexCreditCard', basket.totalGrossPrice);
    expect(paymentInstrument?.custom.awxPaymentIntentId).toBe('int_sgpv6gphmhlhd7c440r');
    expect(paymentInstrument?.custom.awxPaymentIntentCurrency).toBe('GBP');
    expect(paymentInstrument?.custom).not.toHaveProperty('awxPaymentIntentClientSecret');
  });
});
