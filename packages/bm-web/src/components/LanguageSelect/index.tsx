import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '@/components/Select';

type LanguageOption = { value: string; label: string };

const LANGUAGES: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja', label: '日本語' },
  { value: 'he', label: 'עברית' },
  { value: 'zh', label: '中文' },
];

const LanguageSelect = () => {
  const { i18n } = useTranslation();

  const selected = useMemo(() => LANGUAGES.find((l) => l.value === i18n.language) ?? LANGUAGES[0], [i18n.language]);

  const handleChange = useCallback(
    (option: LanguageOption | null) => {
      if (option) {
        i18n.changeLanguage(option.value);
      }
    },
    [i18n],
  );

  return (
    <div css={{ width: 200, flexShrink: 0 }}>
      <Select<LanguageOption>
        options={LANGUAGES}
        value={selected}
        onChange={handleChange}
        isSearchable={false}
        styles={{ menu: (base) => ({ ...base, minWidth: '100%' }) }}
      />
    </div>
  );
};

export default LanguageSelect;
