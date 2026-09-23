import { getPaymentMethodTypes } from '@/api/getPaymentMethodTypes';
import { requestApi } from '@/api/client';
import { registerResources } from '@/utils/paymentMethodRegistry';

jest.mock('@/api/client', () => ({
  requestApi: jest.fn(),
}));

jest.mock('@/utils/paymentMethodRegistry', () => ({
  registerResources: jest.fn(),
}));

const requestApiMock = jest.mocked(requestApi);
const registerResourcesMock = jest.mocked(registerResources);

describe('getPaymentMethodTypes', () => {
  const originalEndpoints = window.endpoints;

  afterEach(() => {
    window.endpoints = originalEndpoints;
    requestApiMock.mockReset();
    registerResourcesMock.mockReset();
  });

  it('returns a configuration error when the payment-method-types endpoint is missing', async () => {
    window.endpoints = { save: '/save', webhook: '/webhook' };

    await expect(getPaymentMethodTypes({ environment: 'demo', clientId: 'id', apiKey: 'key' })).resolves.toEqual({
      success: false,
      error: 'Payment method types endpoint is not configured',
    });
    expect(requestApiMock).not.toHaveBeenCalled();
  });

  it('returns the API error when the request fails', async () => {
    window.endpoints = { save: '/save', webhook: '/webhook', getPaymentMethodTypes: '/pmt' };
    requestApiMock.mockResolvedValue({ success: false, error: 'Invalid credentials' });

    await expect(getPaymentMethodTypes({ environment: 'demo', clientId: 'id', apiKey: 'key' })).resolves.toEqual({
      success: false,
      error: 'Invalid credentials',
    });
    expect(registerResourcesMock).not.toHaveBeenCalled();
  });

  it('returns a fetch-failed error when the successful response has no data', async () => {
    window.endpoints = { save: '/save', webhook: '/webhook', getPaymentMethodTypes: '/pmt' };
    requestApiMock.mockResolvedValue({ success: true });

    await expect(getPaymentMethodTypes({ environment: 'production', clientId: 'id', apiKey: 'key' })).resolves.toEqual({
      success: false,
      error: 'Failed to fetch payment method types',
    });
    expect(registerResourcesMock).not.toHaveBeenCalled();
  });

  it('registers resources and defaults missing method lists to empty arrays', async () => {
    window.endpoints = { save: '/save', webhook: '/webhook', getPaymentMethodTypes: '/pmt' };
    const resources = { visa: { displayName: 'VISA', logoUrl: 'https://example.com/visa.svg' } };
    requestApiMock.mockResolvedValue({
      success: true,
      data: { success: true, resources },
    });

    const request = { environment: 'demo' as const, clientId: 'id', apiKey: 'key' };
    await expect(getPaymentMethodTypes(request)).resolves.toEqual({
      success: true,
      data: {
        cardSchemes: [],
        expressCheckoutPaymentMethods: [],
        additionalPaymentMethods: [],
        resources,
      },
    });

    expect(requestApiMock).toHaveBeenCalledWith('/pmt', { method: 'POST', body: request });
    expect(registerResourcesMock).toHaveBeenCalledWith(resources);
  });
});
