import { getSDKLocale } from './locale';
import type { Env } from '@airwallex/components-sdk';

export const initAirwallexSDK = (): Promise<void> => {
  // When the mini-cart loads via AJAX, `airwallexMetadata.isml` may inject the
  // SDK <script> tag again. Re-execution replaces .init/.createElement with new
  // closures whose internal `initialized` flag is false. Detect this by
  // comparing the init function reference and re-initialise when it changes.
  if (window.__awxSdkInitPromise && window.__awxInitializedSDKRef !== window.AirwallexComponentsSDK.init) {
    window.__awxSdkInitPromise = undefined;
  }

  if (!window.__awxSdkInitPromise) {
    window.__awxInitializedSDKRef = window.AirwallexComponentsSDK.init;
    window.__awxSdkInitPromise = window.AirwallexComponentsSDK.init({
      locale: getSDKLocale(window.airwallexConfig.locale),
      env: window.airwallexConfig.environment as Env,
      enabledElements: ['payments'],
    })
      .then(() => {})
      .catch((err: unknown) => {
        window.__awxSdkInitPromise = undefined;
        window.__awxInitializedSDKRef = undefined as never;
        throw err;
      });
  }
  return window.__awxSdkInitPromise;
};
