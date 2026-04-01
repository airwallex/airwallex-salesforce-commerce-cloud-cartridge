import styled from '@emotion/styled';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const Panel = styled.div`
  position: relative;
  background: var(--color-white);
  border-radius: 6px;
  box-shadow: var(--shadow-card);
  min-width: 400px;
  max-width: min(624px, 90vw);
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--color-purple-10);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const Header = styled.div`
  padding: 32px 40px 16px;
`;

export const Body = styled.div`
  padding: 0 40px 16px;
`;

export const Footer = styled.div`
  padding: 16px 40px 32px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;
