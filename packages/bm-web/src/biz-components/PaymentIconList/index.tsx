import PaymentIcon from '@/components/PaymentIcon';
import { getPaymentMethodName } from '@/utils/paymentMethodNames';
import { PaymentIconListContainer, MoreText } from './styles';

export interface PaymentIconListProps {
  names: string[];
  max?: number;
}

const PaymentIconList = ({ names, max }: PaymentIconListProps) => {
  if (names.length === 0) {
    return null;
  }

  const visibleNames = max !== undefined ? names.slice(0, max) : names;
  const hiddenCount = max !== undefined ? names.length - max : 0;
  const hiddenNames = max !== undefined ? names.slice(max) : [];

  return (
    <PaymentIconListContainer>
      {visibleNames.map((name) => (
        <PaymentIcon key={name} name={name} />
      ))}
      {hiddenCount > 0 && (
        <MoreText title={hiddenNames.map(getPaymentMethodName).join(', ')}>+{hiddenCount} more</MoreText>
      )}
    </PaymentIconListContainer>
  );
};

export default PaymentIconList;
