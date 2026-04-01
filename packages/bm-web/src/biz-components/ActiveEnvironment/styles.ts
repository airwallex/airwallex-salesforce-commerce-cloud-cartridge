import styled from '@emotion/styled';

export const Container = styled.div`
  padding: 24px 40px;
  border-radius: 6px;
  background-color: #fafafb;
  margin-bottom: 32px;
`;

export const EnvironmentName = styled.span<{ active?: boolean }>`
  color: ${({ active }) => (active ? 'var(--color-gray-80)' : 'var(--color-gray-60)')};
  font-size: 18px;
  line-height: 24px;
`;
