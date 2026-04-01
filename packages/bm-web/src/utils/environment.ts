export const ENVIRONMENTS = ['demo', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const getEnvironmentName = (environment: Environment) => {
  if (environment === 'demo') return 'Sandbox';
  if (environment === 'production') return 'Production';
  return 'Unknown';
};
