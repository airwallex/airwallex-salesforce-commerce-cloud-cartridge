/**
 * Client-side config helpers for express checkout.
 *
 * Reads from `window.airwallexConfig` which is injected by
 * `airwallexMetadata.isml` at render time.
 */

export const getEnabledPaymentMethods = (): { applePayEnabled: boolean; googlePayEnabled: boolean } => {
  const config = window.airwallexConfig;
  return {
    applePayEnabled: config?.applePayEnabled ?? false,
    googlePayEnabled: config?.googlePayEnabled ?? false,
  };
};

export const isExpressCheckoutEnabled = (): boolean => {
  const { applePayEnabled, googlePayEnabled } = getEnabledPaymentMethods();
  const cardSchemes = window.airwallexConfig?.cardSchemes ?? [];
  return (applePayEnabled || googlePayEnabled) && cardSchemes.length > 0;
};
