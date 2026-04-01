import { useState } from 'react';
import { Body } from '@/components/Typography';

import { RadioGroupContainer, RadioGroupOption, RadioGroupOptionInput } from './styles';

export interface RadioGroupOption<T extends string = string> {
  label: string;
  value: T;
}

export interface RadioGroupProps<T extends string = string> {
  options: RadioGroupOption<T>[];
  initialValue?: T;
  value?: T;
  onChange?: (value: T) => void;
}

function RadioGroup<T extends string = string>({ options, initialValue, value, onChange }: RadioGroupProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(initialValue);

  const displayValue = value !== undefined ? value : internalValue;

  const handleChange = (newValue: T) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <RadioGroupContainer>
      {options.map(({ value: optValue, label }) => (
        <RadioGroupOption key={optValue}>
          <RadioGroupOptionInput
            type="radio"
            value={optValue}
            checked={displayValue === optValue}
            onChange={() => handleChange(optValue)}
          />
          <Body>{label}</Body>
        </RadioGroupOption>
      ))}
    </RadioGroupContainer>
  );
}

export default RadioGroup;
