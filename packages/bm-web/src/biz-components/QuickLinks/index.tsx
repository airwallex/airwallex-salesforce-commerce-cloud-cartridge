import { useTranslation } from 'react-i18next';
import { Headline } from '@/components/Typography';
import ExternalLink from '@/components/ExternalLink';
import { QuickLinksContainer } from './styles';

const QUICK_LINKS = [
  {
    labelKey: 'quickLinks.paymentMethods' as const,
    href: 'https://www.airwallex.com/docs/payments/payment-methods/payment-methods-overview',
  },
  {
    labelKey: 'quickLinks.sandboxOverview' as const,
    href: 'https://www.airwallex.com/docs/developer-tools/sandbox-environment/sandbox-environment-overview',
  },
];

const QuickLinks = () => {
  const { t } = useTranslation();

  return (
    <QuickLinksContainer>
      <Headline variant="300">{t('quickLinks.title')}</Headline>
      {QUICK_LINKS.map(({ labelKey, href }) => (
        <ExternalLink key={href} href={href}>
          {t(labelKey)}
        </ExternalLink>
      ))}
    </QuickLinksContainer>
  );
};

export default QuickLinks;
