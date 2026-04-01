import { TextLink } from '@/components/Typography';
import externalLinkIcon from '@/assets/external-link.svg?inline';
import { ExternalLinkContainer } from './styles';

import type { ReactNode } from 'react';

export interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  openInNewTab?: boolean;
}

const ExternalLink = ({ href, children, openInNewTab = true }: ExternalLinkProps) => {
  return (
    <TextLink
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
    >
      <ExternalLinkContainer>
        {children}
        <img src={externalLinkIcon} alt="" aria-hidden />
      </ExternalLinkContainer>
    </TextLink>
  );
};

export default ExternalLink;
