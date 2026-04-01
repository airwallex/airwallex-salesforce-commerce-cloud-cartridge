import styled from '@emotion/styled';
import { css } from '@emotion/react';

export interface StyledCheckboxProps {
  checked?: boolean;
}

export const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
`;

export const CheckboxContainer = styled.div`
  position: relative;
  display: inline-block;
  line-height: 0;
  text-align: left;
  opacity: 1;
  direction: ltr;
  border-radius: 4px;
  transition: opacity 0.25s;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  cursor: pointer;
  &:focus-within {
    outline-offset: 2px;
    outline: var(--color-purple-70) solid 2px;
  }
`;

export const CheckboxBox = styled.div<StyledCheckboxProps>(
  ({ checked = false }) => css`
    width: 16px;
    height: 16px;
    position: relative;
    display: inline-block;
    box-sizing: border-box;
    background: ${checked ? 'var(--color-purple-70)' : 'var(--color-white)'};
    border: 2px solid ${checked ? 'var(--color-purple-70)' : 'var(--color-gray-50)'};
    border-radius: 3px;
    transition:
      background 0.2s,
      border-color 0.2s;

    &::after {
      content: '';
      position: absolute;
      left: 4px;
      top: 1px;
      width: 5px;
      height: 9px;
      border: solid var(--color-white);
      border-width: 0 1.5px 1.5px 0;
      transform: ${checked ? 'rotate(45deg) scale(1)' : 'rotate(45deg) scale(0)'};
      opacity: ${checked ? 1 : 0};
      transition:
        transform 0.2s,
        opacity 0.2s;
    }
  `,
);

export const CheckboxInput = styled.input`
  border: 0px;
  clip: rect(0px, 0px, 0px, 0px);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0px;
  position: absolute;
  width: 1px;
`;

export const CheckboxLabel = styled.label`
  font-family: Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 22px;
  font-weight: normal;
  cursor: pointer;
  && {
    margin: 0px;
  }
`;
