import i18n from '@/utils/i18n';

export const getAutoCaptureOptions = () => [
  { value: 'auto' as const, label: i18n.t('captureMethod.authorizeCapture') },
  { value: 'authorize_only' as const, label: i18n.t('captureMethod.authorizeOnly') },
];

export const getAutoCaptureLabel = (value: boolean): string =>
  value ? i18n.t('captureMethod.authorizeCapture') : i18n.t('captureMethod.authorizeOnly');
