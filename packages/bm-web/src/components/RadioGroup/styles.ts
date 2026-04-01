import styled from '@emotion/styled';

export const RadioGroupContainer = styled.div`
  display: flex;
  gap: 16px;
  margin: 12px 0;
`;

export const RadioGroupOption = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RadioGroupOptionInput = styled.input`
  width: 16px;
  height: 16px;
  background-color: var(--color-white);
  border-color: var(--color-gray-50);
  color: currentcolor;
  border-width: 1.5px;
  font: inherit;
  display: grid;
  cursor: pointer;
  appearance: none;
  border-radius: 50%;
  border-style: solid;
  place-content: center;
  transition: border-color 0.15s;
  flex-shrink: 0;

  && {
    margin: 0;
  }

  &:checked {
    border-color: var(--color-purple-70);
  }

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background-color: var(--color-purple-70);
    border-radius: 50%;
    transform: scale(0);
    transition: transform 120ms ease-in-out;
  }

  &:checked::before {
    transform: scale(1);
  }
`;
