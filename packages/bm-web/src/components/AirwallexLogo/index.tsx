import { useTranslation } from 'react-i18next';
import logo from '@/assets/logo.svg?inline';
import { css } from '@emotion/react';

export interface AirwallexLogoProps {
  margin: string;
}

const AirwallexLogo = ({ margin }: AirwallexLogoProps) => {
  const { t } = useTranslation();

  return (
    <img
      css={css`
        margin: ${margin};
        width: auto;
        height: auto;
        display: block;
      `}
      src={logo}
      alt={t('accessibility.airwallexLogo')}
    />
  );
};

export default AirwallexLogo;
