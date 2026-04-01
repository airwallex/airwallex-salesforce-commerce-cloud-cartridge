import styled from '@emotion/styled';
import { css } from '@emotion/react';

export interface StyledSwitchProps {
  on?: boolean;
}

export const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
`;

export const SwitchContainer = styled.div`
  position: relative;
  display: inline-block;
  text-align: left;
  opacity: 1;
  direction: ltr;
  border-radius: 12px;
  transition: opacity 0.25s;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  &:focus-within {
    outline-offset: 2px;
    outline: var(--color-purple-70) solid 2px;
  }
`;

export const SwitchBackground = styled.div<StyledSwitchProps>(
  ({ on = false }) => css`
    height: 24px;
    width: 44px;
    margin: 0px;
    position: relative;
    background: ${on ? 'var(--color-purple-70)' : 'var(--color-gray-50)'};
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.25s;
  `,
);

export const SwitchHandle = styled.div<StyledSwitchProps>(
  ({ on = false }) => css`
    height: 20px;
    width: 20px;
    background: var(--color-white);
    display: inline-block;
    cursor: pointer;
    border-radius: 50%;
    position: absolute;
    transform: ${on ? 'translateX(22px)' : 'translateX(2px)'};
    top: 2px;
    outline: 0px;
    border: 0px;
    transition:
      background-color 0.25s,
      transform 0.25s,
      box-shadow 0.15s;
  `,
);

export const SwitchInput = styled.input`
  border: 0px;
  clip: rect(0px, 0px, 0px, 0px);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0px;
  position: absolute;
  width: 1px;
`;

export const SwitchLabel = styled.label`
  font-family: Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 22px;
  font-weight: normal;
  && {
    margin: 0px;
  }
`;
