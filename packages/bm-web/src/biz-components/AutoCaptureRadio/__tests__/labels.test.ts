import { getAutoCaptureLabel, getAutoCaptureOptions } from '@/biz-components/AutoCaptureRadio/labels';
import '@/utils/i18n';

describe('auto-capture labels', () => {
  it('returns the authorise-and-capture and authorise-only options', () => {
    expect(getAutoCaptureOptions()).toEqual([
      { value: 'auto', label: 'Authorise & capture' },
      { value: 'authorize_only', label: 'Authorise only' },
    ]);
  });

  it('maps the boolean capture setting to its label', () => {
    expect(getAutoCaptureLabel(true)).toBe('Authorise & capture');
    expect(getAutoCaptureLabel(false)).toBe('Authorise only');
  });
});
