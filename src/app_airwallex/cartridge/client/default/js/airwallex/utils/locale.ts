import type { Payment } from '@airwallex/components-sdk';

const SUPPORTED_LOCALES: string[] = [
  'en', 'zh', 'ja', 'ko', 'ar', 'fr', 'es', 'nl', 'de', 'it',
  'zh-HK', 'pl', 'fi', 'ru', 'da', 'id', 'ms', 'sv', 'ro', 'pt',
];

const LOCALE_ALIASES: Record<string, Payment.Locale> = {
  'zh-TW': 'zh-HK',
};

const DEFAULT_LOCALE: Payment.Locale = 'en';

/**
 * Maps an SFCC locale (e.g. "ja_JP", "zh_HK", "en_US") to the closest
 * Airwallex SDK locale, falling back to "en" when unsupported.
 */
export const getSDKLocale = (siteLocale: string): Payment.Locale => {
  const normalized = siteLocale.replace('_', '-');

  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized as Payment.Locale;
  }

  if (normalized in LOCALE_ALIASES) {
    return LOCALE_ALIASES[normalized];
  }

  const language = normalized.split('-')[0];
  if (SUPPORTED_LOCALES.includes(language)) {
    return language as Payment.Locale;
  }

  return DEFAULT_LOCALE;
};
