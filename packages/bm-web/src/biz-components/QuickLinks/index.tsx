import { Headline } from '@/components/Typography';
import ExternalLink from '@/components/ExternalLink';
import { QuickLinksContainer } from './styles';

const QUICK_LINKS = [
  {
    label: 'Payment methods overview',
    href: 'https://www.airwallex.com/docs/payments/payment-methods/payment-methods-overview',
  },
  {
    label: 'Sandbox environment overview',
    href: 'https://www.airwallex.com/docs/developer-tools/sandbox-environment/sandbox-environment-overview',
  },
];

const QuickLinks = () => {
  return (
    <QuickLinksContainer>
      <Headline variant="300">Quick links</Headline>
      {QUICK_LINKS.map(({ label, href }) => (
        <ExternalLink key={href} href={href}>
          {label}
        </ExternalLink>
      ))}
    </QuickLinksContainer>
  );
};

export default QuickLinks;
