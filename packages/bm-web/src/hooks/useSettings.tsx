import { useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsContext } from '@/contexts/settings';
import { saveSettings } from '@/api';
import type { SaveSettingsRequest } from '@/api';

import type { Environment } from '@/utils/environment';
import type { Settings } from '@/contexts/settings';

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};

type CustomPreferenceMap = {
  awx_v1_environment: Environment;
  awx_v1_client_id_demo: string;
  awx_v1_client_id_production: string;
  awx_v1_api_key_demo: string;
  awx_v1_api_key_production: string;
  awx_v1_webhook_secret_demo: string;
  awx_v1_webhook_secret_production: string;
  awx_v1_card_scheme_demo: string;
  awx_v1_card_scheme_production: string;
  awx_v1_express_checkout_demo: string;
  awx_v1_express_checkout_production: string;
  awx_v1_all_payment_methods_demo: string;
  awx_v1_all_payment_methods_production: string;
  awx_v1_auto_capture_demo: boolean;
  awx_v1_auto_capture_production: boolean;
};

const SETTINGS_TO_PREFERENCE: Record<keyof Settings, keyof CustomPreferenceMap> = {
  environment: 'awx_v1_environment',
  clientIdDemo: 'awx_v1_client_id_demo',
  clientIdProduction: 'awx_v1_client_id_production',
  apiKeyDemo: 'awx_v1_api_key_demo',
  apiKeyProduction: 'awx_v1_api_key_production',
  webhookSecretDemo: 'awx_v1_webhook_secret_demo',
  webhookSecretProduction: 'awx_v1_webhook_secret_production',
  cardSchemeDemo: 'awx_v1_card_scheme_demo',
  cardSchemeProduction: 'awx_v1_card_scheme_production',
  expressCheckoutDemo: 'awx_v1_express_checkout_demo',
  expressCheckoutProduction: 'awx_v1_express_checkout_production',
  enabledPaymentMethodsDemo: 'awx_v1_all_payment_methods_demo',
  enabledPaymentMethodsProduction: 'awx_v1_all_payment_methods_production',
  autoCaptureDemo: 'awx_v1_auto_capture_demo',
  autoCaptureProduction: 'awx_v1_auto_capture_production',
};

const transformSettingsToCustomPreferenceMap = (settings: Settings, keys?: (keyof Settings)[]): SaveSettingsRequest => {
  const keysToTransform = keys ?? (Object.keys(SETTINGS_TO_PREFERENCE) as (keyof Settings)[]);
  return keysToTransform.reduce<SaveSettingsRequest>((acc, key) => {
    const prefKey = SETTINGS_TO_PREFERENCE[key];
    if (prefKey !== undefined) {
      acc[prefKey] = settings[key];
    }
    return acc;
  }, {});
};

export type SubmitSettingsResult = {
  success: boolean;
  error?: string;
};

export const useSettings = () => {
  const { t } = useTranslation();
  const { settings, setSettings, updateSetting } = useSettingsContext();

  const getSetting = <K extends keyof Settings>(key: K): Settings[K] => {
    return settings[key];
  };

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSetting(key, value);
  };

  const submitSettings = useCallback(
    async (keys?: (keyof Settings)[], overrides?: Partial<Settings>): Promise<SubmitSettingsResult> => {
      const settingsToSubmit = overrides ? { ...settings, ...overrides } : settings;
      const payload = transformSettingsToCustomPreferenceMap(settingsToSubmit, keys);

      const result = await saveSettings(payload);

      if (result.success) {
        return { success: true };
      }
      return {
        success: false,
        error: result.error ?? t('alerts.failedToSaveSettings'),
      };
    },
    [settings, t],
  );

  return {
    settings,
    getSetting,
    setSetting,
    setSettings,
    submitSettings,
  };
};
