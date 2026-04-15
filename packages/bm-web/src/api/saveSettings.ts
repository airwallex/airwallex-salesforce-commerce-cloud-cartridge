/**
 * Save settings API
 */

import i18n from '@/utils/i18n';
import { requestApi } from './client';

export type SaveSettingsRequest = Record<string, string | boolean | undefined>;

export type SaveSettingsResponse = {
  success: boolean;
};

export async function saveSettings(
  request: SaveSettingsRequest,
): Promise<ReturnType<typeof requestApi<SaveSettingsRequest, SaveSettingsResponse>>> {
  const endpoint = window.endpoints?.save;
  if (!endpoint) {
    return { success: false, error: i18n.t('errors.saveEndpointNotConfigured') };
  }
  return requestApi<SaveSettingsRequest, SaveSettingsResponse>(endpoint, {
    method: 'POST',
    body: request,
  });
}
