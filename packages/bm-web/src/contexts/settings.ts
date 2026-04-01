import { createContext } from 'react';

export type Settings = {
  environment: 'demo' | 'production';
  clientIdDemo: string;
  clientIdProduction: string;
  apiKeyDemo: string;
  apiKeyProduction: string;
  webhookSecretDemo: string;
  webhookSecretProduction: string;
  cardSchemeDemo: string;
  cardSchemeProduction: string;
  expressCheckoutDemo: string;
  expressCheckoutProduction: string;
  enabledPaymentMethodsDemo: string;
  enabledPaymentMethodsProduction: string;
  autoCaptureDemo: boolean;
  autoCaptureProduction: boolean;
};

export type SettingsContextType = {
  settings: Settings;
  setSettings: (settings: Partial<Settings>) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
