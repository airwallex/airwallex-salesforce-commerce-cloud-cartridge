import { useMemo, useCallback } from 'react';
import ReactSelect, {
  mergeStyles,
  components as defaultComponents,
  type ActionMeta,
  type GroupBase,
  type MultiValueProps,
  type OnChangeValue,
  type OptionProps,
  type Props,
  type StylesConfig,
} from 'react-select';

import { OptionWithCheckbox } from './OptionWithCheckbox';
import { selectStyles } from './styles';

const SELECT_ALL_VALUE = '__SELECT_ALL__';

export type SelectProps<Option = unknown, IsMulti extends boolean = false> = Props<Option, IsMulti> & {
  showSelectAll?: boolean;
};

function Select<Option = unknown, IsMulti extends boolean = false>(props: SelectProps<Option, IsMulti>) {
  const {
    styles,
    components,
    hideSelectedOptions,
    closeMenuOnSelect,
    showSelectAll = false,
    options = [],
    value,
    onChange,
    formatOptionLabel,
    getOptionValue = (opt: Option) => (opt as { value: string }).value,
    ...rest
  } = props;

  const baseStyles = selectStyles() as StylesConfig<Option, IsMulti, GroupBase<Option>>;
  const isMulti = rest.isMulti === true;

  const selectAllOption = useMemo(
    () => ({ value: SELECT_ALL_VALUE, label: 'Select all' }) as Option & { value: string; label: string },
    [],
  );

  const allSelected = useMemo(() => {
    if (!isMulti || !showSelectAll || options.length === 0) return false;
    const valueArr = Array.isArray(value) ? value : [];
    return valueArr.length === options.length;
  }, [isMulti, showSelectAll, options.length, value]);

  const optionsWithSelectAll = useMemo(() => {
    if (!showSelectAll || !isMulti) return options;
    const selectAll = {
      ...selectAllOption,
      label: allSelected ? 'Deselect all' : 'Select all',
    } as Option & { value: string; label: string };
    return [selectAll, ...options] as Option[];
  }, [showSelectAll, isMulti, options, selectAllOption, allSelected]);

  const selectedOptions = useMemo(() => {
    if (!showSelectAll || !isMulti) return value;
    const valueArr = Array.isArray(value) ? value : [];
    const getVal = (opt: Option) => getOptionValue(opt as Option & Record<string, unknown>);
    const selected = (optionsWithSelectAll as Option[])
      .slice(1)
      .filter((opt) => valueArr.some((v: Option) => getVal(v) === getVal(opt)));
    return allSelected ? ([optionsWithSelectAll[0], ...selected] as Option[]) : (selected as Option[]);
  }, [showSelectAll, isMulti, value, optionsWithSelectAll, allSelected, getOptionValue]);

  const handleChange = useCallback(
    (selected: OnChangeValue<Option, IsMulti>, actionMeta: ActionMeta<Option>) => {
      if (!onChange) return;
      if (!showSelectAll || !isMulti) {
        onChange(selected as OnChangeValue<Option, IsMulti>, actionMeta as ActionMeta<Option>);
        return;
      }
      if (!selected) {
        onChange(null as OnChangeValue<Option, IsMulti>, actionMeta);
        return;
      }
      const selectedArr = Array.isArray(selected) ? [...selected] : [selected];
      const getVal = (o: Option) => getOptionValue(o as Option & Record<string, unknown>);
      const hasSelectAll = selectedArr.some((o) => getVal(o as Option) === SELECT_ALL_VALUE);
      const actualSelected = selectedArr.filter((o) => getVal(o as Option) !== SELECT_ALL_VALUE) as Option[];

      if (hasSelectAll && !allSelected) {
        onChange(options as OnChangeValue<Option, IsMulti>, actionMeta);
      } else if (!hasSelectAll && allSelected) {
        onChange(null as OnChangeValue<Option, IsMulti>, actionMeta);
      } else {
        onChange((actualSelected.length > 0 ? actualSelected : null) as OnChangeValue<Option, IsMulti>, actionMeta);
      }
    },
    [onChange, showSelectAll, isMulti, options, allSelected, getOptionValue],
  );

  const mergedFormatOptionLabel = useCallback(
    (option: Option, meta: Parameters<NonNullable<Props<Option, true>['formatOptionLabel']>>[1]) => {
      if (showSelectAll && getOptionValue(option as Option & Record<string, unknown>) === SELECT_ALL_VALUE) {
        return allSelected ? 'Deselect all' : 'Select all';
      }
      return formatOptionLabel ? formatOptionLabel(option, meta) : ((option as { label?: string }).label ?? '');
    },
    [showSelectAll, allSelected, formatOptionLabel, getOptionValue],
  );

  const mergedComponents = useMemo(() => {
    const OptionComponent = components?.Option ?? defaultComponents.Option;
    const MultiValueComponent = components?.MultiValue ?? defaultComponents.MultiValue;
    const MultiValueWithCorrectType = MultiValueComponent as React.ComponentType<
      MultiValueProps<Option, IsMulti, GroupBase<Option>>
    >;
    if (!showSelectAll || !isMulti) return { ...components, Option: OptionWithCheckbox };
    return {
      ...components,
      Option: (optionProps: OptionProps<Option, IsMulti, GroupBase<Option>>) =>
        getOptionValue(optionProps.data as Option & Record<string, unknown>) === SELECT_ALL_VALUE ? (
          <OptionComponent {...optionProps}>{optionProps.children}</OptionComponent>
        ) : (
          <OptionWithCheckbox {...optionProps} />
        ),
      MultiValue: (multiValueProps: MultiValueProps<Option, IsMulti, GroupBase<Option>>) =>
        getOptionValue(multiValueProps.data as Option) === SELECT_ALL_VALUE ? null : (
          <MultiValueWithCorrectType {...multiValueProps} />
        ),
    };
  }, [showSelectAll, isMulti, components, getOptionValue]);

  return (
    <ReactSelect<Option, IsMulti, GroupBase<Option>>
      {...rest}
      options={showSelectAll && isMulti ? optionsWithSelectAll : options}
      value={showSelectAll && isMulti ? selectedOptions : value}
      onChange={handleChange}
      hideSelectedOptions={isMulti ? (hideSelectedOptions ?? false) : hideSelectedOptions}
      closeMenuOnSelect={isMulti ? (closeMenuOnSelect ?? false) : closeMenuOnSelect}
      styles={mergeStyles(baseStyles, styles)}
      components={mergedComponents}
      formatOptionLabel={mergedFormatOptionLabel}
      getOptionValue={getOptionValue}
    />
  );
}

export default Select;
