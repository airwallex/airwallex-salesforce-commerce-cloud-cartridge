import styled from '@emotion/styled';

export const StyledCard = styled.div`
  display: block;
  padding: 0px;
  font: inherit;
  color: inherit;
  background: var(--color-white);
  text-align: left;
  text-decoration: none;
  outline: none;
  position: relative;
  border: 1px solid var(--color-gray-20);
  border-radius: 6px;
  box-shadow: var(--shadow-card);

  & + & {
    margin-top: 40px;
  }
`;

export const StyledCardHeader = styled.div<{ withBorder?: boolean }>`
  padding: 32px 40px 24px 40px;
  ${({ withBorder = true }) => withBorder && 'border-bottom: 1px solid var(--color-gray-20);'}
`;

export const StyledCardBody = styled.div`
  padding: 32px 40px;
`;
