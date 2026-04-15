import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import eyeOpenIcon from '@/assets/eye-open.svg?inline';
import eyeClosedIcon from '@/assets/eye-closed.svg?inline';
import copyIcon from '@/assets/copy.svg?inline';
import {
  TextInputWrapper,
  TextInputContainer,
  TextInputLabel,
  TextInputElement,
  TextInputIcon,
  TextInputHint,
} from './styles';
import { useAlert } from '@/hooks/useAlert';

import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  forCopy?: boolean;
  className?: string;
}

const TextInput = ({ label, hint, type, forCopy, value, readOnly, className, ...props }: TextInputProps) => {
  const { t } = useTranslation();
  const isPassword = type === 'password';
  const isForCopy = forCopy && !isPassword;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { alert } = useAlert();

  const handlePasswordVisibility = () => {
    setIsPasswordVisible((visible) => !visible);
  };

  const handleCopy = useCallback(() => {
    const text = typeof value === 'string' ? value : String(value ?? '');
    navigator.clipboard.writeText(text).then(() => {
      alert(t('alerts.copied'), { variant: 'success' });
    });
  }, [value, alert, t]);

  const inputType = useMemo(() => {
    if (isPassword) {
      return isPasswordVisible ? 'text' : 'password';
    }
    return type;
  }, [isPassword, isPasswordVisible, type]);

  const hasRightIcon = isPassword || isForCopy;
  const isReadOnly = isForCopy || readOnly;

  return (
    <TextInputWrapper className={className}>
      {label && <TextInputLabel>{label}</TextInputLabel>}
      <TextInputContainer readOnly={isReadOnly}>
        <TextInputElement hasRightIcon={hasRightIcon} readOnly={isReadOnly} {...props} type={inputType} value={value} />
        {isPassword && (
          <TextInputIcon onClick={handlePasswordVisibility}>
            <img src={isPasswordVisible ? eyeOpenIcon : eyeClosedIcon} alt={t('accessibility.passwordVisibility')} />
          </TextInputIcon>
        )}
        {isForCopy && (
          <TextInputIcon onClick={handleCopy}>
            <img src={copyIcon} alt={t('accessibility.copy')} />
          </TextInputIcon>
        )}
      </TextInputContainer>
      {hint && <TextInputHint>{hint}</TextInputHint>}
    </TextInputWrapper>
  );
};

export default TextInput;
