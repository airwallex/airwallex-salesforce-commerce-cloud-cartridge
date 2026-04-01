export const AUTO_CAPTURE_OPTIONS = [
  { value: 'auto' as const, label: 'Authorize & capture' },
  { value: 'authorize_only' as const, label: 'Authorize only' },
];

export const getAutoCaptureLabel = (value: boolean): string =>
  value ? AUTO_CAPTURE_OPTIONS[0].label : AUTO_CAPTURE_OPTIONS[1].label;
