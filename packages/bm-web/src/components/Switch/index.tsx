import type { ChangeEvent } from 'react';
import { SwitchWrapper, SwitchContainer, SwitchBackground, SwitchHandle, SwitchInput, SwitchLabel } from './styles';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

const Switch = ({ checked, onChange, children }: SwitchProps) => {
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
    <SwitchWrapper>
      <SwitchContainer onClick={handleClick}>
        <SwitchBackground on={checked} />
        <SwitchHandle on={checked} />
        <SwitchInput
          type="checkbox"
          role="switch"
          aria-label="Toggle switch"
          checked={checked}
          onChange={handleChange}
        />
      </SwitchContainer>
      <SwitchLabel>{children}</SwitchLabel>
    </SwitchWrapper>
  );
};

export default Switch;
