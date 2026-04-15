import { useTranslation } from 'react-i18next';
import PaymentIcon from '@/components/PaymentIcon';
import Tooltip from '@/components/Tooltip';
import { getPaymentMethodName } from '@/utils/paymentMethodNames';
import { PaymentIconListContainer, MoreText } from './styles';

export interface PaymentIconListProps {
  names: string[];
  max?: number;
}

const PaymentIconList = ({ names, max }: PaymentIconListProps) => {
  const { t } = useTranslation();

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
        <Tooltip content={hiddenNames.map(getPaymentMethodName).join(', ')}>
          <MoreText>{t('paymentIconList.more', { count: hiddenCount })}</MoreText>
        </Tooltip>
      )}
    </PaymentIconListContainer>
  );
};

export default PaymentIconList;
