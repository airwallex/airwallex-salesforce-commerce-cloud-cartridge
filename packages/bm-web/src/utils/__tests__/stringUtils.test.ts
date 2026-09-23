import { capitalize, maskString } from '@/utils/stringUtils';

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('uppercases the first character', () => {
      expect(capitalize('demo')).toBe('Demo');
    });

    it('returns an empty string unchanged', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('maskString', () => {
    it('replaces every character with the default bullet', () => {
      expect(maskString('1234567890')).toBe('••••••••••');
    });

    it('uses a custom mask character', () => {
      expect(maskString('abc', '*')).toBe('***');
    });
  });
});
