import { validateCardPaymentIntent } from '../validation';

const post = jest.fn();

describe('card PaymentIntent validation client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'httpClient', {
      configurable: true,
      value: { post },
    });
  });

  it.each(['valid', 'stale', 'unavailable'] as const)('returns a supported %s response', async status => {
    post.mockResolvedValue({ data: { status } });

    await expect(validateCardPaymentIntent('int_123')).resolves.toEqual({ status });
    expect(post).toHaveBeenCalledWith('Airwallex-ValidateCardPaymentIntent', {
      paymentIntentId: 'int_123',
    });
  });

  it.each([
    ['request failure', Promise.reject(new Error('network unavailable'))],
    ['malformed response', Promise.resolve({ data: { status: 'unexpected' } })],
  ])('fails closed as unavailable for a %s', async(_scenario, result) => {
    post.mockReturnValue(result);

    await expect(validateCardPaymentIntent('int_123')).resolves.toEqual({ status: 'unavailable' });
  });
});
