import styled from '@emotion/styled';
import type { GroupBase, StylesConfig } from 'react-select';

export const OptionCheckboxWrapper = styled.span`
  display: flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
`;

export const selectStyles = <
  OptionType = unknown,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<OptionType> = GroupBase<OptionType>,
>(): StylesConfig<OptionType, IsMulti, Group> => ({
  container: (provided, { selectProps }) => ({
    ...provided,
    ...(selectProps.isDisabled && { pointerEvents: 'auto' }),
  }),

  control: (provided, state) => {
    const { isFocused, isDisabled } = state;

    return {
      ...provided,
      borderColor: 'var(--color-gray-20)',
      background: 'var(--color-gray-5)',
      cursor: 'pointer',
      minHeight: 40,
      borderRadius: 6,
      transition: 'border-color .15s, box-shadow .15s, background .15s',

      ...(isFocused && {
        borderColor: 'var(--color-purple-70)',
        background: 'var(--color-white)',
        outline: '2px solid var(--color-purple-70)',
        outlineOffset: -2,
        position: 'relative',
        zIndex: 3,
        boxShadow: 'none',
      }),

      ...(isDisabled && {
        cursor: 'not-allowed',
        borderColor: 'var(--color-gray-20)',
        background: 'var(--color-gray-10)',
        '&:hover': {
          background: 'var(--color-gray-10)',
        },
      }),

      '&:hover': {
        background: isDisabled ? 'var(--color-gray-10)' : 'var(--color-white)',
      },
    };
  },

  valueContainer: (provided, { isMulti }) => ({
    ...provided,
    padding: '0 16px',
    margin: 0,
    maxHeight: 96,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...(isMulti && {
      overflow: 'auto',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    }),
  }),

  placeholder: (provided) => ({
    ...provided,
    fontSize: 14,
    lineHeight: '22px',
    color: 'var(--color-gray-50)',
    display: 'flex',
    alignItems: 'center',
  }),

  menu: (provided) => ({
    ...provided,
    boxShadow: '0 2px 16px 0 rgba(0, 0, 0, 0.12)',
    borderRadius: 6,
    backgroundColor: 'var(--color-white)',
    minWidth: 240,
    marginTop: 4,
    zIndex: 1001,
  }),

  menuList: (provided) => ({
    ...provided,
    padding: 8,
  }),

  option: (provided, { isSelected, isFocused, isDisabled }) => ({
    ...provided,
    fontSize: 14,
    lineHeight: '22px',
    color: 'var(--color-gray-80)',
    cursor: 'pointer',
    borderRadius: 4,
    padding: 8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',

    '&:last-of-type': {
      marginBottom: 0,
    },

    '&:active': {
      backgroundColor: 'var(--color-purple-30)',
    },

    ...(isSelected && {
      color: 'var(--color-gray-80)',
      backgroundColor: 'transparent',
    }),

    ...(isFocused && {
      color: 'var(--color-purple-70)',
      backgroundColor: 'var(--color-purple-30)',
      '&:active': {
        backgroundColor: 'var(--color-purple-30)',
      },
    }),

    ...(isDisabled && {
      opacity: 0.4,
    }),
  }),

  singleValue: (provided, { isDisabled }) => ({
    ...provided,
    fontSize: 14,
    lineHeight: '22px',
    color: isDisabled ? 'var(--color-gray-50)' : 'var(--color-gray-90)',
  }),

  multiValue: (provided) => ({
    ...provided,
    color: 'var(--color-gray-90)',
    backgroundColor: 'var(--color-gray-20)',
    borderRadius: 4,
    marginBlock: 4,
    height: 24,
    display: 'flex',
    alignItems: 'center',
  }),

  multiValueLabel: (provided) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
  }),

  multiValueRemove: (provided) => ({
    ...provided,
    color: 'var(--color-gray-80)',
    backgroundColor: 'transparent',
    '&:hover': {
      color: 'var(--color-gray-90)',
      backgroundColor: 'transparent',
    },
  }),

  input: (provided) => ({
    ...provided,
    display: 'flex',
    flex: 1,
    margin: 0,
    padding: 0,
    '& input': {
      font: 'inherit',
    },
  }),

  dropdownIndicator: (provided, { isDisabled }) => ({
    ...provided,
    color: isDisabled ? 'var(--color-gray-40)' : 'var(--color-gray-70)',
    paddingRight: 16,
  }),

  clearIndicator: (provided) => ({
    ...provided,
    color: 'var(--color-gray-70)',
  }),

  indicatorSeparator: () => ({
    display: 'none',
  }),
});
