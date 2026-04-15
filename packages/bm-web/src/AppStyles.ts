import styled from '@emotion/styled';

export const SIDEBAR_BREAKPOINT = 960;

export const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  container-type: inline-size;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 56px;
`;

export const ContentRow = styled.div`
  display: flex;
  gap: 64px;
  align-items: flex-start;
  align-self: stretch;
  width: 100%;

  @container (max-width: ${SIDEBAR_BREAKPOINT}px) {
    flex-direction: column-reverse;
    gap: 40px;
  }
`;

export const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;
