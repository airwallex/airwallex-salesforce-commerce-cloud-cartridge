import { ButtonContainer, Spinner } from './styles';

import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const Button = ({ variant = 'primary', loading = false, children, disabled, ...props }: ButtonProps) => {
  return (
    <ButtonContainer variant={variant} $loading={loading} disabled={disabled || loading} {...props}>
      {loading && <Spinner aria-hidden />}
      {children}
    </ButtonContainer>
  );
};

export default Button;
