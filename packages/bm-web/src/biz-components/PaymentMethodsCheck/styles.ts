import styled from '@emotion/styled';

export const PaymentMethodsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const PaymentMethodItem = styled.div`
  /* Override Checkbox default margin for horizontal layout */
  & > div {
    margin: 0;
  }
  /* Vertically center icon and label text */
  label {
    display: inline-flex;
    align-items: center;
  }
`;

export const PaymentIconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
`;
