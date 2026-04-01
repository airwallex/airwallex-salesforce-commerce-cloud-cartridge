import styled from '@emotion/styled';

export interface StyledPaymentIconProps {
  width?: number;
  height?: number;
}

export const StyledPaymentIcon = styled.img<StyledPaymentIconProps>`
  display: inline-block;
  vertical-align: middle;
  width: ${({ width = 30 }) => width}px;
  height: ${({ height = 20 }) => height}px;
`;
