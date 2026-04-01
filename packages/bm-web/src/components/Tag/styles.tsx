import styled from '@emotion/styled';
import { css } from '@emotion/react';

import type { TagVariant } from './types';

export interface StyledTagProps {
  variant?: TagVariant;
}

export const StyledTag = styled.div<StyledTagProps>(
  ({ variant = 'default' }) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 700;
    ${variant === 'purple' &&
    css`
      color: var(--color-purple-80);
      background-color: var(--color-purple-20);
    `}
    ${variant === 'green' &&
    css`
      color: var(--color-green-80);
      background-color: var(--color-green-20);
    `}
    ${variant === 'default' &&
    css`
      color: var(--color-gray-80);
      background-color: var(--color-gray-20);
    `}
  `,
);
