/**
 * Get payment method types API
 */

import { requestApi, type ApiResponseBody } from './client';
import { registerResources } from '@/utils/paymentMethodRegistry';

import type { Environment } from '@/utils/environment';

export type GetPaymentMethodTypesRequest = {
  environment: Environment;
  clientId: string;
  apiKey: string;
};

export type PaymentMethodResourceInfo = {
  displayName: string;
  logoUrl: string;
};

export type GetPaymentMethodTypesResponse = ApiResponseBody & {
  cardSchemes?: string[];
  expressCheckoutPaymentMethods?: string[];
  additionalPaymentMethods?: string[];
  resources?: Record<string, PaymentMethodResourceInfo>;
};

export type GetPaymentMethodTypesSuccessData = {
  cardSchemes: string[];
  expressCheckoutPaymentMethods: string[];
  additionalPaymentMethods: string[];
  resources: Record<string, PaymentMethodResourceInfo>;
};

export async function getPaymentMethodTypes(
  request: GetPaymentMethodTypesRequest,
): Promise<{ success: true; data: GetPaymentMethodTypesSuccessData } | { success: false; error: string }> {
  const endpoint = window.endpoints?.getPaymentMethodTypes;
  if (!endpoint) {
    return { success: false, error: 'Payment method types endpoint is not configured' };
  }

  const result = await requestApi<GetPaymentMethodTypesRequest, GetPaymentMethodTypesResponse>(endpoint, {
    method: 'POST',
    body: request,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? 'Failed to fetch payment method types' };
  }

  if (!result.data) {
    return { success: false, error: 'Failed to fetch payment method types' };
  }

  const resources = result.data.resources ?? {};
  registerResources(resources);

  return {
    success: true,
    data: {
      cardSchemes: result.data.cardSchemes ?? [],
      expressCheckoutPaymentMethods: result.data.expressCheckoutPaymentMethods ?? [],
      additionalPaymentMethods: result.data.additionalPaymentMethods ?? [],
      resources,
    },
  };
}
