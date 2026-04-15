import { getSDKLocale } from './locale';
import type { Env } from '@airwallex/components-sdk';

let initPromise: Promise<void> | null = null;

export const initAirwallexSDK = (): Promise<void> => {
  if (!initPromise) {
    initPromise = window.AirwallexComponentsSDK.init({
      locale: getSDKLocale(window.airwallexConfig.locale),
      env: window.airwallexConfig.environment as Env,
      enabledElements: ['payments'],
    }).then(() => {}).catch((err: unknown) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};
