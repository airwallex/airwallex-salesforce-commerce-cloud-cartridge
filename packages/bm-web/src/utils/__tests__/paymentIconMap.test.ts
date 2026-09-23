import { getPaymentIconAssetName } from '@/utils/paymentIconMap';

describe('getPaymentIconAssetName', () => {
  it('lowercases the name and converts hyphens to underscores', () => {
    expect(getPaymentIconAssetName('Apple-Pay')).toBe('apple_pay');
  });

  it('trims surrounding whitespace', () => {
    expect(getPaymentIconAssetName('  google-pay  ')).toBe('google_pay');
  });
});
