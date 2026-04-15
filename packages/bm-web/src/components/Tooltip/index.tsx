import styled from '@emotion/styled';

import type { ReactNode } from 'react';

const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;

  &:hover > [data-tooltip-content] {
    visibility: visible;
    opacity: 1;
  }
`;

const TooltipContent = styled.span`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-gray-90);
  color: var(--color-white);
  font-size: 12px;
  line-height: 16px;
  width: max-content;
  max-width: 320px;
  pointer-events: none;
  transition: opacity 0.15s ease-in-out;
  z-index: 10;
`;

const ChildWrapper = styled.span`
  display: inline-flex;
  pointer-events: auto;
`;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

const Tooltip = ({ content, children }: TooltipProps) => (
  <TooltipWrapper>
    <ChildWrapper>{children}</ChildWrapper>
    <TooltipContent data-tooltip-content>{content}</TooltipContent>
  </TooltipWrapper>
);

export default Tooltip;
