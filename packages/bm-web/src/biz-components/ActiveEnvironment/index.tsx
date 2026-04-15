import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';

import banIcon from '@/assets/ban.svg?inline';
import { Container, EnvironmentName } from './styles';
import { Headline, Body } from '@/components/Typography';
import { useSettings } from '@/hooks/useSettings';
import { getEnvironmentName } from '@/utils/environment';

const ActiveEnvironment = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const environment = settings.environment;

  return (
    <Container>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: 4px;
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
          `}
        >
          <Headline variant="200">{t('activeEnvironment.title')}</Headline>
          <EnvironmentName active={!!environment}>
            {environment ? (
              getEnvironmentName(environment)
            ) : (
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                `}
              >
                <img src={banIcon} alt={t('activeEnvironment.notConnectedAlt')} />
                {t('activeEnvironment.notConnected')}
              </span>
            )}
          </EnvironmentName>
        </div>
        {!environment && <Body variant="subtle">{t('activeEnvironment.configureHint')}</Body>}
      </div>
    </Container>
  );
};

export default ActiveEnvironment;
