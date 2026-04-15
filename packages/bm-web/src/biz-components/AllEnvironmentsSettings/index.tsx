import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headline, Body } from '@/components/Typography';
import EnvironmentSettings from '@/biz-components/EnvironmentSettings';
import Modal from '@/components/Modal';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/hooks/useAlert';
import { getEnvironmentName } from '@/utils/environment';
import scalableImage from '@/assets/scalable.svg?inline';
import addBusinessImage from '@/assets/add-business.svg?inline';

import type { Settings } from '@/contexts/settings';
import type { Environment } from '@/utils/environment';

const ENV_TO_SETTINGS_KEYS: Record<Environment, (keyof Settings)[]> = {
  demo: [
    'clientIdDemo',
    'apiKeyDemo',
    'webhookSecretDemo',
    'cardSchemeDemo',
    'expressCheckoutDemo',
    'enabledPaymentMethodsDemo',
    'autoCaptureDemo',
  ],
  production: [
    'clientIdProduction',
    'apiKeyProduction',
    'webhookSecretProduction',
    'cardSchemeProduction',
    'expressCheckoutProduction',
    'enabledPaymentMethodsProduction',
    'autoCaptureProduction',
  ],
};

const AllEnvironmentsSettings = () => {
  const { t } = useTranslation();
  const { settings, submitSettings, setSettings, setSetting } = useSettings();
  const { alert } = useAlert();
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [showProductionActivateModal, setShowProductionActivateModal] = useState(false);
  const [isActivatingProduction, setIsActivatingProduction] = useState(false);
  const [showSandboxActivateModal, setShowSandboxActivateModal] = useState(false);
  const [isActivatingSandbox, setIsActivatingSandbox] = useState(false);

  const performActivate = async (env: Environment) => {
    const result = await submitSettings(['environment'], { environment: env });
    if (result.success) {
      setSetting('environment', env);
      alert(t('alerts.environmentActivated', { environment: getEnvironmentName(env) }), { variant: 'success' });
    } else {
      alert(result.error ?? t('alerts.failedToUpdateEnvironment'), { variant: 'error' });
      throw new Error(result.error);
    }
  };

  const demoName = getEnvironmentName('demo');
  const productionName = getEnvironmentName('production');

  const environments: {
    env: Environment;
    title: string;
    description: string;
    emptyState: {
      image: React.ReactNode;
      title: string;
      description: string;
    };
    clientId: string;
    apiKey: string;
    webhookSecret: string;
    cardScheme: string;
    expressCheckout: string;
    additionalPaymentMethods: string;
    autoCapture: boolean;
  }[] = [
    {
      env: 'demo',
      title: t('environmentSettings.title', { environment: demoName }),
      description: t('environmentSettings.demo.description'),
      emptyState: {
        image: <img src={scalableImage} alt={demoName} />,
        title: t('environmentSettings.emptyState.demo.title', { environment: demoName }),
        description: t('environmentSettings.emptyState.demo.description'),
      },
      clientId: settings.clientIdDemo,
      apiKey: settings.apiKeyDemo,
      webhookSecret: settings.webhookSecretDemo,
      cardScheme: settings.cardSchemeDemo,
      expressCheckout: settings.expressCheckoutDemo,
      additionalPaymentMethods: settings.enabledPaymentMethodsDemo,
      autoCapture: settings.autoCaptureDemo,
    },
    {
      env: 'production',
      title: t('environmentSettings.title', { environment: productionName }),
      description: t('environmentSettings.production.description'),
      emptyState: {
        image: <img src={addBusinessImage} alt={productionName} />,
        title: t('environmentSettings.emptyState.production.title', { environment: productionName }),
        description: t('environmentSettings.emptyState.production.description'),
      },
      clientId: settings.clientIdProduction,
      apiKey: settings.apiKeyProduction,
      webhookSecret: settings.webhookSecretProduction,
      cardScheme: settings.cardSchemeProduction,
      expressCheckout: settings.expressCheckoutProduction,
      additionalPaymentMethods: settings.enabledPaymentMethodsProduction,
      autoCapture: settings.autoCaptureProduction,
    },
  ];

  return (
    <Fragment>
      <Modal
        open={showProductionActivateModal}
        onClose={() => setShowProductionActivateModal(false)}
        onConfirm={async () => {
          setIsActivatingProduction(true);
          try {
            await performActivate('production');
            setShowProductionActivateModal(false);
          } finally {
            setIsActivatingProduction(false);
          }
        }}
        title={t('modal.enableLivePayments.title')}
        message={t('modal.enableLivePayments.message')}
        confirmText={t('modal.enableLivePayments.confirm')}
        loading={isActivatingProduction}
      />
      <Modal
        open={showSandboxActivateModal}
        onClose={() => setShowSandboxActivateModal(false)}
        onConfirm={async () => {
          setIsActivatingSandbox(true);
          try {
            await performActivate('demo');
            setShowSandboxActivateModal(false);
          } finally {
            setIsActivatingSandbox(false);
          }
        }}
        title={t('modal.disableLivePayments.title')}
        message={t('modal.disableLivePayments.message')}
        confirmText={t('modal.disableLivePayments.confirm')}
        confirmButtonVariant="danger"
        loading={isActivatingSandbox}
      />
      {environments.map(
        ({
          env,
          title,
          description,
          emptyState,
          clientId,
          apiKey,
          webhookSecret,
          cardScheme,
          expressCheckout,
          additionalPaymentMethods,
          autoCapture,
        }) => (
          <EnvironmentSettings
            key={env}
            environment={env}
            activatedEnvironment={settings.environment}
            editingEnvironment={editingEnvironment}
            onEditChange={setEditingEnvironment}
            title={<Headline variant="200">{title}</Headline>}
            description={<Body variant="subtle">{description}</Body>}
            emptyState={emptyState}
            values={{
              clientId,
              apiKey,
              webhookSecret,
              cardScheme,
              expressCheckout,
              additionalPaymentMethods,
              autoCapture,
            }}
            onActivate={async () => {
              if (env === 'production' && settings.environment === 'demo') {
                setShowProductionActivateModal(true);
                return;
              }
              if (settings.environment === 'production' && env === 'demo') {
                setShowSandboxActivateModal(true);
                return;
              }
              await performActivate(env);
            }}
            onSubmit={async (values) => {
              const keys = ENV_TO_SETTINGS_KEYS[env];
              const overrides: Partial<Settings> = {
                [keys[0]]: values.clientId,
                [keys[1]]: values.apiKey,
                [keys[2]]: values.webhookSecret,
                [keys[3]]: values.cardScheme,
                [keys[4]]: values.expressCheckout,
                [keys[5]]: values.additionalPaymentMethods,
                [keys[6]]: values.autoCapture,
              };
              const result = await submitSettings(keys, overrides);
              if (result.success) {
                setSettings(overrides);
                alert(t('alerts.settingsSaved', { environment: getEnvironmentName(env) }), { variant: 'success' });
              } else {
                alert(result.error ?? t('alerts.failedToSaveSettings'), { variant: 'error' });
                throw new Error(result.error);
              }
            }}
          />
        ),
      )}
    </Fragment>
  );
};

export default AllEnvironmentsSettings;
