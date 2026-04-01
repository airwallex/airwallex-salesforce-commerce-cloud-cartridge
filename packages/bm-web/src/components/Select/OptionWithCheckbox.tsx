import { components, type GroupBase, type OptionProps } from 'react-select';
import { CheckboxBox } from '@/components/Checkbox/styles';
import { OptionCheckboxWrapper } from './styles';

export function OptionWithCheckbox<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: OptionProps<Option, IsMulti, Group>,
) {
  const { isMulti, isSelected, children } = props;

  if (!isMulti) {
    return <components.Option {...props} />;
  }

  return (
    <components.Option {...props}>
      <OptionCheckboxWrapper>
        <CheckboxBox checked={isSelected} />
      </OptionCheckboxWrapper>
      {children}
    </components.Option>
  );
}
