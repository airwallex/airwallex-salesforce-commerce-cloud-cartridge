import React from 'react';

import errorIcon from '@/assets/error.svg?inline';
import successIcon from '@/assets/success.svg?inline';
import warningIcon from '@/assets/warning.svg?inline';
import infoIcon from '@/assets/info.svg?inline';
import { StyledAlert, AlertContent, AlertDescription } from './styles';
import type { AlertVariant } from './types';

export interface AlertProps {
  variant?: AlertVariant;
  subtle?: boolean;
  children: React.ReactNode;
}

const alertIconMap: Record<AlertVariant, string> = {
  info: infoIcon,
  success: successIcon,
  warning: warningIcon,
  error: errorIcon,
};

const Alert = ({ variant = 'info', subtle, children }: AlertProps) => {
  return (
    <StyledAlert variant={variant} subtle={subtle}>
      <img src={alertIconMap[variant]} alt={variant} />
      <AlertContent>
        <AlertDescription subtle={subtle}>{children}</AlertDescription>
      </AlertContent>
    </StyledAlert>
  );
};

export default Alert;
