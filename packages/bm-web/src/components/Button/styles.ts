import styled from '@emotion/styled';

export const Spinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: button-spinner 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;

  @keyframes button-spinner {
    to {
      transform: rotate(360deg);
    }
  }
`;

/**
 * Uses CSS variables defined in :root (main.tsx)
 */
export const ButtonContainer = styled.button<{
  variant?: 'primary' | 'secondary' | 'danger';
  $loading?: boolean;
}>`
  display: inline-block;
  position: relative;
  padding: 7px 15px;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;

  ${({ variant = 'primary' }) =>
    variant === 'primary'
      ? `
      background: var(--color-purple-70);
      color: var(--color-white);
      border: 1px solid transparent;

      &:hover:not(:disabled) {
        background: var(--color-purple-60);
        border: 1px solid transparent;
      }

      &:active:not(:disabled) {
        background: var(--color-purple-50);
        border: 1px solid transparent;
      }

      &:focus-visible {
        outline: 2px solid var(--color-purple-70);
        background: var(--color-purple-70);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:hover:not(:disabled) {
        background: var(--color-purple-60);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:active:not(:disabled) {
        background: var(--color-purple-50);
        border: 1px solid var(--color-white);
      }

      &:disabled {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        cursor: not-allowed;
        border: 1px solid transparent;
      }

      &:disabled:hover,
      &:disabled:focus-visible,
      &:disabled:active {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        border: 1px solid transparent;
      }
    `
      : variant === 'danger'
        ? `
      background: var(--color-red-60);
      color: var(--color-white);
      border: 1px solid transparent;

      &:hover:not(:disabled) {
        background: var(--color-red-50);
        border: 1px solid transparent;
      }

      &:active:not(:disabled) {
        background: var(--color-red-40);
        border: 1px solid transparent;
      }

      &:focus-visible {
        outline: 2px solid var(--color-red-60);
        background: var(--color-red-60);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:hover:not(:disabled) {
        background: var(--color-red-50);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:active:not(:disabled) {
        background: var(--color-red-40);
        border: 1px solid var(--color-white);
      }

      &:disabled {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        cursor: not-allowed;
        border: 1px solid transparent;
      }

      &:disabled:hover,
      &:disabled:focus-visible,
      &:disabled:active {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        border: 1px solid transparent;
      }
    `
        : `
      background: var(--color-white);
      color: var(--color-purple-70);
      border: 1px solid var(--color-gray-20);

      &:hover:not(:disabled) {
        background: var(--color-purple-10);
        border: 1px solid var(--color-purple-30);
      }

      &:active:not(:disabled) {
        background: var(--color-purple-30);
        border: 1px solid var(--color-purple-30);
      }

      &:focus-visible {
        outline: 2px solid var(--color-purple-70);
        background: var(--color-white);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:hover:not(:disabled) {
        background: var(--color-purple-10);
        border: 1px solid var(--color-white);
      }

      &:focus-visible:active:not(:disabled) {
        background: var(--color-purple-30);
        border: 1px solid var(--color-white);
      }

      &:disabled {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        cursor: not-allowed;
        border: 1px solid var(--color-gray-20);
      }

      &:disabled:hover,
      &:disabled:focus-visible,
      &:disabled:active {
        background: var(--color-gray-20);
        color: var(--color-gray-50);
        border: 1px solid var(--color-gray-20);
      }
    `}

  /* Loading state: keep variant styling, show spinner, different from disabled grey */
  ${({ variant = 'primary', $loading }) =>
    $loading &&
    (variant === 'primary'
      ? `
    cursor: wait;
    pointer-events: none;
    background: var(--color-purple-70) !important;
    color: var(--color-white) !important;
    border-color: transparent !important;
    opacity: 0.9;
  `
      : variant === 'danger'
        ? `
    cursor: wait;
    pointer-events: none;
    background: var(--color-red-60) !important;
    color: var(--color-white) !important;
    border-color: transparent !important;
    opacity: 0.9;
  `
        : `
    cursor: wait;
    pointer-events: none;
    background: var(--color-white) !important;
    color: var(--color-purple-70) !important;
    border-color: var(--color-gray-20) !important;
    opacity: 0.9;
  `)}
`;

export const ButtonText = styled.span``;
