import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckboxWrapper, CheckboxContainer, CheckboxBox, CheckboxInput, CheckboxLabel } from './styles';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

const Checkbox = ({ checked, onChange, children }: CheckboxProps) => {
  const { t } = useTranslation();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.checked);
  };

  const handleClick = () => {
    if (onChange) {
      const syntheticEvent = {
        target: { checked: !checked },
      } as ChangeEvent<HTMLInputElement>;
      handleChange(syntheticEvent);
    }
  };

  return (
    <CheckboxWrapper>
      <CheckboxContainer onClick={handleClick}>
        <CheckboxBox checked={checked} />
        <CheckboxInput
          type="checkbox"
          role="checkbox"
          aria-checked={checked}
          aria-label={t('accessibility.checkbox')}
          checked={checked}
          onChange={handleChange}
        />
      </CheckboxContainer>
      <CheckboxLabel>{children}</CheckboxLabel>
    </CheckboxWrapper>
  );
};

export default Checkbox;
