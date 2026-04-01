import styled from '@emotion/styled';
import { css } from '@emotion/react';

import type { AlertVariant } from './types';

export interface StyledAlertProps {
  variant?: AlertVariant;
  subtle?: boolean;
}

export const StyledAlert = styled.div<StyledAlertProps>(
  ({ variant = 'info', subtle }) => css`
    display: grid;
    text-align: left;
    gap: ${subtle ? '8px' : '16px'};
    padding: ${subtle ? '8px 12px' : '15px'};
    font-size: 14px;
    border-radius: 6px;
    grid-template-columns: auto 1fr;
    ${subtle
      ? css`
          background: var(--color-gray-5);
          border: 1px solid var(--color-gray-20);
        `
      : variant === 'info' &&
        css`
          background: var(--color-blue-5);
          border: 1px solid var(--color-blue-40);
        `}
    ${!subtle &&
    variant === 'success' &&
    css`
      background: var(--color-green-5);
      border: 1px solid var(--color-green-40);
    `}
    ${!subtle &&
    variant === 'warning' &&
    css`
      background: var(--color-orange-5);
      border: 1px solid var(--color-orange-40);
    `}
    ${!subtle &&
    variant === 'error' &&
    css`
      background: var(--color-red-5);
      border: 1px solid var(--color-red-40);
    `}
  `,
);

export const AlertContent = styled.div`
  display: flex;
  flex-direction: column;
  order: 2;
`;

export const AlertDescription = styled.div<{ subtle?: boolean }>`
  font-size: 14px;
  line-height: 22px;
  font-weight: normal;
  ${({ subtle }) => subtle && 'color: var(--color-gray-60);'}
`;
