import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from '@emotion/react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import Switch from '@/components/Switch';
import { Body, Headline } from '@/components/Typography';
import { useAlert } from '@/hooks/useAlert';
import { useSettings } from '@/hooks/useSettings';

const AnalyticsSettings = () => {
  const { t } = useTranslation();
  const { alert } = useAlert();
  const { settings, setSetting, submitSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (analyticsEnabled: boolean) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await submitSettings(['analyticsEnabled'], { analyticsEnabled });
      if (result.success) {
        setSetting('analyticsEnabled', analyticsEnabled);
        alert(t('alerts.analyticsSettingsSaved'), { variant: 'success' });
      } else {
        alert(result.error ?? t('alerts.failedToSaveSettings'), { variant: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 4px;
          `}
        >
          <Headline variant="200">{t('analytics.title')}</Headline>
          <Body variant="subtle">{t('analytics.description')}</Body>
        </div>
      </CardHeader>
      <CardBody>
        <Switch checked={settings.analyticsEnabled} onChange={handleChange}>
          {t('analytics.enable')}
        </Switch>
      </CardBody>
    </Card>
  );
};

export default AnalyticsSettings;
