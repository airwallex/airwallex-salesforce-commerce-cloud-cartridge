import type { Settings } from '../contexts/settings';

declare global {
  interface Window {
    endpoints: {
      save: string;
      webhook: string;
      getPaymentMethodTypes?: string;
    };
    airwallexBusinessManager: Settings;
    userLocale?: string;
  }
}

export {};
