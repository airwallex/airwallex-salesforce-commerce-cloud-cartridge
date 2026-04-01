import { css } from '@emotion/react';

import banIcon from '@/assets/ban.svg?inline';
import { Container, EnvironmentName } from './styles';
import { Headline, Body } from '@/components/Typography';
import { useSettings } from '@/hooks/useSettings';
import { getEnvironmentName } from '@/utils/environment';

const ActiveEnvironment = () => {
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
            gap: 12px;
          `}
        >
          <Headline variant="200">Active Environment:</Headline>
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
                <img src={banIcon} alt="not connected" />
                Not connected
              </span>
            )}
          </EnvironmentName>
        </div>
        {!environment && <Body variant="subtle">Configure Production or Sandbox to activate Airwallex payments.</Body>}
      </div>
    </Container>
  );
};

export default ActiveEnvironment;
