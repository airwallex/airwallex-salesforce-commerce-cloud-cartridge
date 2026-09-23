describe('paymentMethodRegistry', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('registers resources under a normalized key and looks them up by any equivalent name', async () => {
    const { registerResources, getRegisteredDisplayName, getRegisteredLogoUrl } =
      await import('@/utils/paymentMethodRegistry');

    registerResources({
      'Apple-Pay': { displayName: 'Apple Pay Custom', logoUrl: 'https://example.com/ap.svg' },
    });

    expect(getRegisteredDisplayName('apple_pay')).toBe('Apple Pay Custom');
    expect(getRegisteredLogoUrl('APPLE-PAY')).toBe('https://example.com/ap.svg');
  });

  it('keeps the first registration when the same method is registered again', async () => {
    const { registerResources, getRegisteredDisplayName, getRegisteredLogoUrl } =
      await import('@/utils/paymentMethodRegistry');

    registerResources({ foo: { displayName: 'First', logoUrl: 'https://example.com/a.svg' } });
    registerResources({ foo: { displayName: 'Second', logoUrl: 'https://example.com/b.svg' } });

    expect(getRegisteredDisplayName('foo')).toBe('First');
    expect(getRegisteredLogoUrl('foo')).toBe('https://example.com/a.svg');
  });

  it('skips entries that have no display name', async () => {
    const { registerResources, getRegisteredDisplayName, getRegisteredLogoUrl } =
      await import('@/utils/paymentMethodRegistry');

    registerResources({ empty: { displayName: '', logoUrl: 'https://example.com/empty.svg' } });

    expect(getRegisteredDisplayName('empty')).toBeUndefined();
    expect(getRegisteredLogoUrl('empty')).toBeUndefined();
  });
});
