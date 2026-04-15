import i18n from '@/utils/i18n';

export const ENVIRONMENTS = ['demo', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const getEnvironmentName = (environment: Environment) => {
  if (environment === 'demo') return i18n.t('environment.sandbox');
  if (environment === 'production') return i18n.t('environment.production');
  return i18n.t('environment.unknown');
};
