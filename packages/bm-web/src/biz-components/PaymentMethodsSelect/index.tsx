import { useMemo, useCallback } from 'react';
import Select from '@/components/Select';
import PaymentIcon from '@/components/PaymentIcon';

import { OptionLabel } from './styles';

export interface PaymentMethodsSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

const PaymentMethodsSelect = ({ options, value, onChange }: PaymentMethodsSelectProps) => {
  const selectedOptions = useMemo(() => options.filter((opt) => value.includes(opt.value)), [options, value]);

  const handleChange = useCallback(
    (selected: readonly { value: string; label: string }[] | { value: string; label: string } | null) => {
      if (!selected) {
        onChange([]);
        return;
      }
      const arr = Array.isArray(selected) ? selected : [selected];
      onChange(arr.map((o) => o.value));
    },
    [onChange],
  );

  return (
    <Select
      isMulti
      showSelectAll
      options={options}
      value={selectedOptions}
      onChange={handleChange}
      getOptionValue={(opt) => opt.value}
      getOptionLabel={(opt) => opt.label}
      formatOptionLabel={(option, meta) => {
        const isInValue = meta.context === 'value';
        return (
          <OptionLabel>
            <PaymentIcon name={option.value} width={isInValue ? 24 : 30} height={isInValue ? 16 : 20} />
            {option.label}
          </OptionLabel>
        );
      }}
    />
  );
};

export default PaymentMethodsSelect;
