import Checkbox from '@/components/Checkbox';
import PaymentIcon from '@/components/PaymentIcon';
import { PaymentMethodsContainer, PaymentMethodItem, PaymentIconWrapper } from './styles';

export interface PaymentMethodsCheckProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

const PaymentMethodsCheck = ({ options, value, onChange }: PaymentMethodsCheckProps) => {
  const handleToggle = (optionValue: string) => {
    const isChecked = value.includes(optionValue);
    const newValue = isChecked ? value.filter((v) => v !== optionValue) : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <PaymentMethodsContainer>
      {options.map((option) => (
        <PaymentMethodItem key={option.value}>
          <Checkbox checked={value.includes(option.value)} onChange={() => handleToggle(option.value)}>
            <PaymentIconWrapper>
              <PaymentIcon name={option.value} />
            </PaymentIconWrapper>
            {option.label}
          </Checkbox>
        </PaymentMethodItem>
      ))}
    </PaymentMethodsContainer>
  );
};

export default PaymentMethodsCheck;
