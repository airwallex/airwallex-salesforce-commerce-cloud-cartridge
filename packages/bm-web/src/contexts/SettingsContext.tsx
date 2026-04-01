import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { SettingsContext, type Settings } from './settings';

const getInitialSettings = (): Settings => {
  const config = window.airwallexBusinessManager;
  return {
    environment: config?.environment || 'demo',
    clientIdDemo: config?.clientIdDemo || '',
    clientIdProduction: config?.clientIdProduction || '',
    apiKeyDemo: config?.apiKeyDemo || '',
    apiKeyProduction: config?.apiKeyProduction || '',
    webhookSecretDemo: config?.webhookSecretDemo || '',
    webhookSecretProduction: config?.webhookSecretProduction || '',
    cardSchemeDemo: config?.cardSchemeDemo || '',
    cardSchemeProduction: config?.cardSchemeProduction || '',
    expressCheckoutDemo: config?.expressCheckoutDemo || '',
    expressCheckoutProduction: config?.expressCheckoutProduction || '',
    enabledPaymentMethodsDemo: config?.enabledPaymentMethodsDemo || '',
    enabledPaymentMethodsProduction: config?.enabledPaymentMethodsProduction || '',
    autoCaptureDemo: config?.autoCaptureDemo ?? true,
    autoCaptureProduction: config?.autoCaptureProduction ?? true,
  };
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<Settings>(getInitialSettings);

  const setSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, updateSetting }}>{children}</SettingsContext.Provider>
  );
};
