import type { PaymentMethodTypeConfig } from '@/cartridge/scripts/airwallex/api/types';

import { buildResourcesFromPaymentMethods, parsePreferenceUpdates } from '../airwallexSettings';

function createPaymentMethod(name: string, overrides: Partial<PaymentMethodTypeConfig> = {}): PaymentMethodTypeConfig {
  return {
    name,
    transaction_mode: 'oneoff',
    flows: [],
    transaction_currencies: [],
    country_codes: [],
    active: true,
    ...overrides,
  };
}

describe('Airwallex settings helpers', () => {
  describe('parsePreferenceUpdates', () => {
    it.each(['null', '"settings"', '[]'])('rejects non-object payload %s', payload => {
      expect(() => parsePreferenceUpdates(payload)).toThrow('Invalid settings payload');
    });

    it('returns validated preference updates', () => {
      expect(
        parsePreferenceUpdates(
          JSON.stringify({
            awx_v1_environment: 'production',
            awx_v1_client_id_production: 'client-id',
            awx_v1_auto_capture_production: true,
          }),
        ),
      ).toEqual([
        { key: 'awx_v1_environment', value: 'production' },
        { key: 'awx_v1_client_id_production', value: 'client-id' },
        { key: 'awx_v1_auto_capture_production', value: true },
      ]);
    });
  });

  describe('buildResourcesFromPaymentMethods', () => {
    it('falls back to the payment method name and an empty logo', () => {
      expect(buildResourcesFromPaymentMethods([createPaymentMethod('wechatpay')])).toEqual({
        wechatpay: {
          displayName: 'wechatpay',
          logoUrl: '',
        },
      });
    });

    it('falls back for card scheme metadata', () => {
      expect(
        buildResourcesFromPaymentMethods([
          createPaymentMethod('card', {
            card_schemes: [{ name: 'visa' }],
          }),
        ]),
      ).toEqual({
        card: {
          displayName: 'card',
          logoUrl: '',
        },
        visa: {
          displayName: 'visa',
          logoUrl: '',
        },
      });
    });

    it('uses the last resource when payment method names are duplicated', () => {
      expect(
        buildResourcesFromPaymentMethods([
          createPaymentMethod('applepay', { display_name: 'Apple Pay' }),
          createPaymentMethod('applepay', {
            display_name: 'Apple Pay Updated',
            resources: {
              has_schema: false,
              logos: { png: 'apple-pay.png' },
            },
          }),
        ]),
      ).toEqual({
        applepay: {
          displayName: 'Apple Pay Updated',
          logoUrl: 'apple-pay.png',
        },
      });
    });
  });
});
