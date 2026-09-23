import { ENVIRONMENTS, getEnvironmentName } from '@/utils/environment';

describe('environment', () => {
  it('lists demo and production', () => {
    expect(ENVIRONMENTS).toEqual(['demo', 'production']);
  });

  it('returns the sandbox label for demo', () => {
    expect(getEnvironmentName('demo')).toBe('Sandbox');
  });

  it('returns the production label for production', () => {
    expect(getEnvironmentName('production')).toBe('Production');
  });
});
