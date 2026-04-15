import styled from '@emotion/styled';
import { SIDEBAR_BREAKPOINT } from '@/AppStyles';

export const QuickLinksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 0;

  @container (max-width: ${SIDEBAR_BREAKPOINT}px) {
    position: static;
  }
`;
