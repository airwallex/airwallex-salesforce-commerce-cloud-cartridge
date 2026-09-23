import { getPaymentMethodName } from '@/utils/paymentMethodNames';
import { registerResources } from '@/utils/paymentMethodRegistry';

describe('getPaymentMethodName', () => {
  it('returns the mapped display name for a known id', () => {
    expect(getPaymentMethodName('visa')).toBe('VISA');
    expect(getPaymentMethodName('applepay')).toBe('Apple Pay');
  });

  it('normalizes case and surrounding whitespace before lookup', () => {
    expect(getPaymentMethodName('  Mastercard  ')).toBe('Mastercard');
  });

  it('falls back to a registered display name when the static map has no entry', () => {
    registerResources({
      brand_new_method: { displayName: 'Brand New', logoUrl: 'https://example.com/bn.svg' },
    });

    expect(getPaymentMethodName('Brand-New-Method')).toBe('Brand New');
  });

  it('returns the normalized id when nothing is mapped or registered', () => {
    expect(getPaymentMethodName('Completely-Unknown')).toBe('completely-unknown');
  });
});
