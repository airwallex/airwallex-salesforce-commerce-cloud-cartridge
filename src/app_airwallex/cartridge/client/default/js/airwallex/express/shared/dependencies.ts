/**
 * Lazily creates `window.httpClient` from the axios CDN script and base URL
 * injected by `airwallexMetadata.isml`. The client serialises all POST data
 * as form-urlencoded and automatically appends the CSRF token from the
 * hidden input rendered alongside the express checkout containers.
 */
export const ensureHttpClient = (): void => {
  if (typeof window.httpClient !== 'undefined') return;
  if (!window.axios || !window.airwallexBaseUrl) return;
  const { axios, airwallexBaseUrl } = window;
  window.httpClient = axios.create({
    baseURL: airwallexBaseUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformRequest: [
      (data: Record<string, string> | undefined) => {
        if (!data) return data;
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => {
          const value = data[key];
          if (value === undefined) return;
          params.append(key, value);
        });
        const csrfEl = document.getElementById('airwallex-csrf-token') as HTMLInputElement | null;
        if (csrfEl) params.append('csrf_token', csrfEl.value);
        return params;
      },
    ],
  });
};

/**
 * Poll up to 3 s (15 x 200 ms) for the Airwallex SDK and axios to be ready.
 * External scripts injected via ISML load asynchronously, so they may not
 * be available immediately when our JS runs.
 */
export const waitForDependencies = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const check = (attempts: number) => {
      ensureHttpClient();
      if (typeof window.httpClient !== 'undefined' && typeof window.AirwallexComponentsSDK !== 'undefined') {
        resolve();
      } else if (attempts > 0) {
        setTimeout(() => check(attempts - 1), 200);
      } else {
        reject(new Error('Express checkout dependencies not available after timeout'));
      }
    };
    check(15);
  });
};
