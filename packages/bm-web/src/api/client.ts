/**
 * Base API client with reusable fetch configuration and error handling
 */

import i18n from '@/utils/i18n';

export type ApiResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export type ApiResponseBody = {
  success: boolean;
  message?: string;
};

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

/**
 * Base function to trigger fetch calls with reusable fields and general error handling
 */
export async function requestApi<TRequest, TResponse extends ApiResponseBody>(
  endpoint: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: TRequest;
  },
): Promise<ApiResult<TResponse>> {
  try {
    const response = await fetch(endpoint, {
      method: options.method,
      headers: DEFAULT_HEADERS,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const data = (await response.json()) as TResponse;

    if (!data.success) {
      return {
        success: false,
        error: data.message ?? i18n.t('errors.requestFailed'),
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t('errors.unknownError'),
    };
  }
}
