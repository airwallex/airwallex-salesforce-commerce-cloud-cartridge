import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const TextInputWrapper = styled.div`
  display: grid;
  gap: 4px;
  width: 100%;
  min-width: 0;
`;

export const TextInputLabel = styled.label`
  font-size: 14px;
  line-height: 22px;
  font-weight: normal;
  margin: 0px;
`;

export const TextInputContainer = styled.div<{ readOnly?: boolean }>`
  display: flex;
  align-items: center;
  position: relative;
  gap: 12px;
  min-height: 40px;
  border-radius: 6px;
  border: ${({ readOnly }) => (readOnly ? 'none' : '1px solid var(--color-gray-20)')};
  background: var(--color-gray-5);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
  padding-left: 0px;
  padding-right: 0px;
  ${({ readOnly }) =>
    !readOnly &&
    css`
      &:has(> input:focus-within) {
        background: var(--color-white);
        border-color: var(--color-purple-70);
        outline: var(--color-purple-70) solid 2px;
        outline-offset: -2px;
        position: relative;
        z-index: 3;
      }
    `}
`;

export const TextInputElement = styled.input<{ hasRightIcon?: boolean }>`
  outline: none;
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  padding: 8px 16px;
  width: 100%;
  border-radius: 4px;
  color: var(--color-gray-90);
  height: 38px;
  flex-grow: 1;
  ${({ hasRightIcon }) =>
    hasRightIcon &&
    css`
      padding-right: 44px;
    `}
`;

export const TextInputIcon = styled.div`
  display: flex;
  align-items: center;
  order: 2;
  cursor: pointer;
  background-color: transparent;
  height: 38px;
  position: absolute;
  right: 16px;
`;

export const TextInputHint = styled.div`
  margin: 4px 0px 0px 0px;
  font-size: 12px;
  line-height: 18px;
  font-weight: normal;
  color: var(--color-gray-60);
`;
