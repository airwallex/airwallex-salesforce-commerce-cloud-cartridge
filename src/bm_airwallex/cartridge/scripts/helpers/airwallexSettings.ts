import type { CardScheme, Logo, PaymentMethodTypeConfig } from '@/cartridge/scripts/airwallex/api/types';
import type { CustomPreferenceMap } from '@/cartridge/scripts/helpers/configHelper';

export const CARD_PAYMENT_METHOD_NAME = 'card';
export const EXPRESS_CHECKOUT_METHODS = ['applepay', 'googlepay'];

const CUSTOM_PREFERENCE_KEYS: Array<keyof CustomPreferenceMap> = [
  'awx_v1_environment',
  'awx_v1_client_id_demo',
  'awx_v1_client_id_production',
  'awx_v1_api_key_demo',
  'awx_v1_api_key_production',
  'awx_v1_webhook_secret_demo',
  'awx_v1_webhook_secret_production',
  'awx_v1_card_scheme_demo',
  'awx_v1_card_scheme_production',
  'awx_v1_express_checkout_demo',
  'awx_v1_express_checkout_production',
  'awx_v1_all_payment_methods_demo',
  'awx_v1_all_payment_methods_production',
  'awx_v1_auto_capture_demo',
  'awx_v1_auto_capture_production',
  'awx_v1_analytics_enabled',
];

const BOOLEAN_PREFERENCE_KEYS: Array<keyof CustomPreferenceMap> = [
  'awx_v1_auto_capture_demo',
  'awx_v1_auto_capture_production',
  'awx_v1_analytics_enabled',
];

export interface PaymentMethodResourceInfo {
  displayName: string;
  logoUrl: string;
}

export interface PreferenceUpdate {
  key: keyof CustomPreferenceMap;
  value: string | boolean;
}

function getLogoFromLogos(logos: Logo | undefined): string {
  if (!logos) return '';
  return logos.svg || logos.png || '';
}

export function buildResourcesFromPaymentMethods(
  items: PaymentMethodTypeConfig[],
): Record<string, PaymentMethodResourceInfo> {
  const resources = items.reduce<Record<string, PaymentMethodResourceInfo>>(
    (result, item) => ({
      ...result,
      [item.name]: {
        displayName: item.display_name || item.name,
        logoUrl: getLogoFromLogos(item.resources?.logos),
      },
    }),
    {},
  );

  const cardPaymentMethod = items.find(item => item.name === CARD_PAYMENT_METHOD_NAME);
  return (cardPaymentMethod?.card_schemes ?? []).reduce<Record<string, PaymentMethodResourceInfo>>(
    (result, scheme: CardScheme) => ({
      ...result,
      [scheme.name]: {
        displayName: scheme.display_name || scheme.name,
        logoUrl: getLogoFromLogos(scheme.resources?.logos),
      },
    }),
    resources,
  );
}

function isCustomPreferenceKey(key: string): key is keyof CustomPreferenceMap {
  return CUSTOM_PREFERENCE_KEYS.indexOf(key as keyof CustomPreferenceMap) >= 0;
}

function isValidPreferenceValue(key: keyof CustomPreferenceMap, value: unknown): value is string | boolean {
  if (key === 'awx_v1_environment') {
    return value === 'demo' || value === 'production';
  }

  if (BOOLEAN_PREFERENCE_KEYS.indexOf(key) >= 0) {
    return typeof value === 'boolean';
  }

  return typeof value === 'string';
}

export function parsePreferenceUpdates(body: string): PreferenceUpdate[] {
  const parsedBody = JSON.parse(body) as unknown;
  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    throw new Error('Invalid settings payload');
  }

  return Object.keys(parsedBody).map(key => {
    if (!isCustomPreferenceKey(key)) {
      throw new Error('Unknown settings key');
    }

    const value = (parsedBody as Record<string, unknown>)[key];
    if (!isValidPreferenceValue(key, value)) {
      throw new Error('Invalid settings value');
    }

    return { key, value };
  });
}

const airwallexSettingsHelper = {
  CARD_PAYMENT_METHOD_NAME,
  EXPRESS_CHECKOUT_METHODS,
  buildResourcesFromPaymentMethods,
  parsePreferenceUpdates,
};

module.exports = airwallexSettingsHelper;

export default airwallexSettingsHelper;
