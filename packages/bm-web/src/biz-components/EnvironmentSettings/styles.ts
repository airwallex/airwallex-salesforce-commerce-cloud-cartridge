import styled from '@emotion/styled';

export const SectionIntro = styled.div`
  margin-bottom: 24px;

  > *:first-of-type {
    margin-bottom: 4px;
  }
`;

export const SectionIntroWithMargin = styled(SectionIntro)`
  margin-top: 24px;
`;

export const IdKeyContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: end;

  > *:first-of-type,
  > *:nth-of-type(2) {
    min-width: 0;
  }
`;

export const VerifyAlert = styled.div`
  margin-top: 8px;
`;

export const WebhookUrlContainer = styled.div`
  margin-top: 24px;
`;

export const WebhookSecretInput = styled.div`
  margin-top: 12px;
`;

export const PaymentMethodsContainer = styled.div`
  margin-top: 8px;
`;

export const PaymentMethodsSection = styled.div`
  margin-top: 24px;
`;

export const SettingLine = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 32px;
  overflow-wrap: anywhere;
  word-break: break-all;

  > *:nth-of-type(2) {
    min-width: 0;
  }

  & + & {
    margin-top: 24px;
  }
`;

export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const EmptyStateImage = styled.div`
  margin-bottom: 16px;
`;

export const EmptyStateTitle = styled.div`
  margin-bottom: 4px;
`;
