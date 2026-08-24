export {};

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockHttps = jest.fn();
const mockCsrfValidation = jest.fn();
const mockValidateCardPaymentIntent = jest.fn();

jest.mock(
  'server',
  () => ({
    get: mockGet,
    post: mockPost,
    middleware: {
      https: mockHttps,
    },
    exports: jest.fn(() => ({})),
  }),
  { virtual: true },
);
jest.mock(
  '@/cartridge/scripts/middleware/csrf',
  () => ({
    __esModule: true,
    default: {
      validateRequest: mockCsrfValidation,
    },
  }),
  { virtual: true },
);
jest.mock('../middlewares/index', () => ({
  __esModule: true,
  default: {
    airwallex: {
      showConfirmation: jest.fn(),
      expressCheckoutMethods: jest.fn(),
      shippingOptions: jest.fn(),
      selectShippingMethod: jest.fn(),
      expressCheckoutAuthorization: jest.fn(),
      createTemporaryBasket: jest.fn(),
      applePaySession: jest.fn(),
      returnFromPayment: jest.fn(),
      validateCardPaymentIntent: mockValidateCardPaymentIntent,
    },
  },
}));

describe('Airwallex storefront controller', () => {
  it('protects card PaymentIntent validation with HTTPS and CSRF middleware', () => {
    require('../Airwallex');

    expect(mockPost).toHaveBeenCalledWith(
      'ValidateCardPaymentIntent',
      mockHttps,
      mockCsrfValidation,
      mockValidateCardPaymentIntent,
    );
  });
});
