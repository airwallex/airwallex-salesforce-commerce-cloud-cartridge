import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import he from '@/locales/he.json';
import zh from '@/locales/zh.json';

const SUPPORTED_LANGUAGES = ['en', 'ja', 'he', 'zh'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Accepts locale strings in either SFCC format (en_US) or BCP 47 format (en-US)
// and returns the first base-language match against SUPPORTED_LANGUAGES.
function matchLanguage(langs: string[]): SupportedLanguage | undefined {
  for (const lang of langs) {
    const normalized = lang.toLowerCase().replace(/_/g, '-');
    const base = normalized.split('-')[0];
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(base)) {
      return base as SupportedLanguage;
    }
  }
  return undefined;
}

// Language priority: Salesforce Preferred UI Locale → browser language → English.
// window.userLocale is injected by the ISML template from request.locale.
function detectLanguage(): SupportedLanguage {
  if (window.userLocale) {
    const sfccMatch = matchLanguage([window.userLocale]);
    if (sfccMatch) return sfccMatch;
  }

  const browserLanguages = navigator.languages ?? [navigator.language];
  return matchLanguage([...browserLanguages]) ?? 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    he: { translation: he },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  // Fall back to base language when a key's value is an empty string.
  // Required by the Airwallex i18n service (see FAQ #10).
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
