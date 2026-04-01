import { css } from '@emotion/react';
import styled from '@emotion/styled';

export interface StyledBodyProps {
  bold?: boolean;
  variant?: 'default' | 'subtle' | 'primary';
}

const variantColors = {
  default: 'var(--color-gray-60)',
  subtle: 'var(--color-text-subtle)',
  primary: 'var(--color-gray-80)',
} as const;

export const StyledBody = styled.div<StyledBodyProps>(
  ({ variant = 'default', bold }) => css`
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    font-weight: ${bold ? 700 : 'normal'};
    color: ${variantColors[variant]};
  `,
);

export interface StyledHeadlineProps {
  variant?: '100' | '200' | '300';
}

export const StyledHeadline = styled.div<StyledHeadlineProps>(
  ({ variant = '100' }) => css`
    font-family: Helvetica, Arial, sans-serif;
    font-weight: bold;
    line-height: 1.5;
    ${variant === '100' &&
    css`
      font-size: 24px;
    `}
    ${variant === '200' &&
    css`
      font-size: 18px;
    `}
    ${variant === '300' &&
    css`
      font-size: 16px;
    `}
  `,
);

export const StyledTextLink = styled.a(css`
  font-family: Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;

  // Add priority to override the Salesforce default styles
  &&& {
    color: var(--color-purple-70);
  }

  &&&:hover {
    text-decoration: underline;
  }

  &&&:hover *:not(img) {
    text-decoration: underline;
  }
`);
