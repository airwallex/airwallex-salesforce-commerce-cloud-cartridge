import logo from '@/assets/logo.svg?inline';
import { css } from '@emotion/react';

export interface AirwallexLogoProps {
  margin: string;
}

const AirwallexLogo = ({ margin }: AirwallexLogoProps) => {
  return (
    <img
      css={css`
        margin: ${margin};
        width: auto;
        height: auto;
        display: block;
      `}
      src={logo}
      alt="Airwallex Logo"
    />
  );
};

export default AirwallexLogo;
