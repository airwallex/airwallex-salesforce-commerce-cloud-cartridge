import { requestApi } from '@/api/client';

const jsonResponse = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('requestApi', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts JSON and returns the response body on success', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: true, id: 'saved' }));

    const result = await requestApi('/save', { method: 'POST', body: { foo: 'bar' } });

    expect(fetchMock).toHaveBeenCalledWith('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    expect(result).toEqual({ success: true, data: { success: true, id: 'saved' } });
  });

  it('omits the body when none is provided', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: true }));

    await requestApi('/ping', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('/ping', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    });
  });

  it('returns an HTTP error when the response is not ok', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: false }, 500));

    await expect(requestApi('/save', { method: 'POST' })).resolves.toEqual({
      success: false,
      error: 'HTTP error! status: 500',
    });
  });

  it('returns the API message when the body reports failure', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: false, message: 'Invalid credentials' }));

    await expect(requestApi('/save', { method: 'POST' })).resolves.toEqual({
      success: false,
      error: 'Invalid credentials',
    });
  });

  it('falls back to a generic request-failed message when the body has no message', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: false }));

    await expect(requestApi('/save', { method: 'POST' })).resolves.toEqual({
      success: false,
      error: 'Request failed',
    });
  });

  it('returns the thrown Error message', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(requestApi('/save', { method: 'POST' })).resolves.toEqual({
      success: false,
      error: 'network down',
    });
  });

  it('returns a generic unknown-error message for non-Error throws', async () => {
    fetchMock.mockRejectedValue('boom');

    await expect(requestApi('/save', { method: 'POST' })).resolves.toEqual({
      success: false,
      error: 'Unknown error occurred',
    });
  });
});
