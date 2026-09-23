import { detectLanguage, matchLanguage } from '@/utils/i18n';

const originalUserLocale = window.userLocale;
const originalLanguages = window.navigator.languages;
const originalLanguage = window.navigator.language;

const mockNavigatorLanguages = (languages: string[], language = languages[0] ?? 'en') => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => languages,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => language,
  });
};

describe('matchLanguage', () => {
  it('matches an exact supported language', () => {
    expect(matchLanguage(['ja'])).toBe('ja');
  });

  it('normalizes SFCC and BCP 47 locale tags to the base language', () => {
    expect(matchLanguage(['en_US'])).toBe('en');
    expect(matchLanguage(['he-IL'])).toBe('he');
  });

  it('maps any Chinese locale to zh-CN', () => {
    expect(matchLanguage(['zh'])).toBe('zh-CN');
    expect(matchLanguage(['zh-TW'])).toBe('zh-CN');
    expect(matchLanguage(['zh_CN'])).toBe('zh-CN');
  });

  it('returns the first supported language in the list', () => {
    expect(matchLanguage(['fr', 'ja-JP', 'en'])).toBe('ja');
  });

  it('returns undefined when nothing matches', () => {
    expect(matchLanguage([])).toBeUndefined();
    expect(matchLanguage(['de', 'fr'])).toBeUndefined();
  });
});

describe('detectLanguage', () => {
  afterEach(() => {
    window.userLocale = originalUserLocale;
    mockNavigatorLanguages([...originalLanguages], originalLanguage);
  });

  it('prefers the Salesforce UI locale when it is supported', () => {
    window.userLocale = 'ja_JP';
    mockNavigatorLanguages(['en']);

    expect(detectLanguage()).toBe('ja');
  });

  it('falls through to the browser language when the Salesforce locale is unsupported', () => {
    window.userLocale = 'xx_YY';
    mockNavigatorLanguages(['he-IL']);

    expect(detectLanguage()).toBe('he');
  });

  it('defaults to English when neither Salesforce nor the browser match', () => {
    delete window.userLocale;
    mockNavigatorLanguages(['de-DE']);

    expect(detectLanguage()).toBe('en');
  });
});
