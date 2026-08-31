import { ApplePay } from '../applePay';
import { GooglePay } from '../googlePay';

type AuthorizedHandler = (event: unknown) => Promise<void>;

interface CheckoutUnderTest {
  element: unknown;
  listenToEvents: () => void;
}

const checkoutProps = {
  amount: { value: 100, currency: 'USD' },
  countryCode: 'US',
  storeName: 'Test Store',
  shippingAddressCountryOptions: [],
};

const address = {
  name: 'Test User',
  givenName: 'Test',
  familyName: 'User',
  address1: '123 Test Street',
  addressLines: ['123 Test Street'],
  locality: 'New York',
  administrativeArea: 'NY',
  postalCode: '10001',
  countryCode: 'US',
  phoneNumber: '1234567890',
  emailAddress: 'test@example.com',
};

const captureAuthorizedHandler = (checkout: CheckoutUnderTest) => {
  let authorizedHandler: AuthorizedHandler | undefined;
  const confirmIntent = jest.fn().mockResolvedValue({ id: 'int_test' });
  const on = jest.fn((eventName: string, handler: AuthorizedHandler) => {
    if (eventName === 'authorized') {
      authorizedHandler = handler;
    }
  });
  checkout.element = { on, confirmIntent };
  checkout.listenToEvents();

  if (!authorizedHandler) {
    throw new Error('Authorized handler was not registered');
  }

  return { authorizedHandler, confirmIntent };
};

describe('express checkout authorization', () => {
  let post: jest.Mock;

  beforeEach(() => {
    post = jest.fn().mockResolvedValue({
      data: {
        clientSecret: 'secret_test',
      },
    });
    (window as unknown as { httpClient: { post: jest.Mock } }).httpClient = { post };
  });

  it('identifies Apple Pay in the authorization request', async() => {
    const applePay = new ApplePay(checkoutProps);
    const { authorizedHandler } = captureAuthorizedHandler(applePay);

    await authorizedHandler({
      detail: {
        paymentData: {
          billingContact: address,
          shippingContact: address,
        },
      },
    });

    expect(post).toHaveBeenCalledWith(
      'Airwallex-ExpressCheckoutAuthorization',
      expect.objectContaining({ expressPaymentMethod: 'applepay' }),
    );
  });

  it('identifies Google Pay in the authorization request', async() => {
    const googlePay = new GooglePay(checkoutProps);
    const { authorizedHandler } = captureAuthorizedHandler(googlePay);

    await authorizedHandler({
      detail: {
        paymentData: {
          paymentMethodData: {
            info: {
              billingAddress: address,
            },
          },
          shippingAddress: address,
          email: 'test@example.com',
        },
      },
    });

    expect(post).toHaveBeenCalledWith(
      'Airwallex-ExpressCheckoutAuthorization',
      expect.objectContaining({ expressPaymentMethod: 'googlepay' }),
    );
  });
});
