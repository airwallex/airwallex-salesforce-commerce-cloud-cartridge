import { saveSettings } from '@/api/saveSettings';

const jsonResponse = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('saveSettings', () => {
  const fetchMock = jest.fn();
  const originalEndpoints = window.endpoints;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    window.endpoints = originalEndpoints;
  });

  it('returns a configuration error when the save endpoint is missing', async () => {
    window.endpoints = { save: '', webhook: '/webhook' };

    await expect(saveSettings({ awx_v1_environment: 'demo' })).resolves.toEqual({
      success: false,
      error: 'Save endpoint is not configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the preference map to the save endpoint', async () => {
    window.endpoints = { save: '/airwallex/save', webhook: '/webhook' };
    fetchMock.mockReturnValue(jsonResponse({ success: true }));

    const request = { awx_v1_environment: 'production' as const, awx_v1_analytics_enabled: true };
    await expect(saveSettings(request)).resolves.toEqual({
      success: true,
      data: { success: true },
    });
    expect(fetchMock).toHaveBeenCalledWith('/airwallex/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  });
});
