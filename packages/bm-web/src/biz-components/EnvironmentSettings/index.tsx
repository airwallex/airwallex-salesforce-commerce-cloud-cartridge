import { useState, Fragment, useMemo, useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';

import { Card, CardHeader, CardBody } from '@/components/Card';
import Button from '@/components/Button';
import Tag from '@/components/Tag';
import SettingHeader from '@/biz-components/SettingHeader';
import { Body, Headline } from '@/components/Typography';
import TextInput from '@/components/TextInput';
import { TextInputHint } from '@/components/TextInput/styles';
import Alert from '@/components/Alert';
import PaymentMethodsCheck from '@/biz-components/PaymentMethodsCheck';
import PaymentMethodsSelect from '@/biz-components/PaymentMethodsSelect';
import PaymentIconList from '@/biz-components/PaymentIconList';
import AutoCaptureRadio from '@/biz-components/AutoCaptureRadio';
import { getAutoCaptureLabel } from '@/biz-components/AutoCaptureRadio/labels';
import { getPaymentMethodName } from '@/utils/paymentMethodNames';
import { maskString } from '@/utils/stringUtils';
import { getPaymentMethodTypes } from '@/api';
import {
  IdKeyContainer,
  SettingLine,
  VerifyAlert,
  WebhookUrlContainer,
  WebhookSecretInput,
  PaymentMethodsContainer,
  PaymentMethodsSection,
  EmptyStateContainer,
  EmptyStateImage,
  EmptyStateTitle,
  SectionIntro,
  SectionIntroWithMargin,
} from './styles';

import type { ReactNode } from 'react';
import { getEnvironmentName, type Environment } from '@/utils/environment';

export interface SettingsFormValues {
  clientId: string;
  apiKey: string;
  webhookSecret: string;
  cardScheme: string;
  expressCheckout: string;
  additionalPaymentMethods: string;
  autoCapture: boolean;
}

const parseCommaSeparated = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export interface EnvironmentSettingsProps {
  environment: Environment;
  title: ReactNode;
  description: ReactNode;
  emptyState?: {
    title?: ReactNode;
    description?: ReactNode;
    image?: ReactNode;
  };
  values: SettingsFormValues;
  onSubmit: (values: SettingsFormValues) => void | Promise<void>;
  /** When provided and different from this component's environment, shows Activate button */
  activatedEnvironment?: Environment;
  /** Called when user clicks Activate to switch to this environment */
  onActivate?: () => void | Promise<void>;
  /** When provided, editing is controlled: only this env can be editing; others quit when one starts */
  editingEnvironment?: Environment | null;
  /** Called when edit mode starts or ends (for coordination with sibling EnvironmentSettings) */
  onEditChange?: (env: Environment | null) => void;
}

const EnvironmentSettings = ({
  environment,
  title,
  description,
  emptyState,
  values,
  onSubmit,
  activatedEnvironment,
  onActivate,
  editingEnvironment,
  onEditChange,
}: EnvironmentSettingsProps) => {
  const { t } = useTranslation();
  const [internalEditing, setInternalEditing] = useState(false);
  const isControlled = editingEnvironment !== undefined && onEditChange !== undefined;
  const isEditing = isControlled ? editingEnvironment === environment : internalEditing;
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showVerifyAlert, setShowVerifyAlert] = useState(false);
  const verifyAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardSchemes, setCardSchemes] = useState<string[]>([]);
  const [expressCheckoutPaymentMethods, setExpressCheckoutPaymentMethods] = useState<string[]>([]);
  const [additionalPaymentMethods, setAdditionalPaymentMethods] = useState<string[]>([]);
  const [selectedCardSchemes, setSelectedCardSchemes] = useState<string[]>(() =>
    parseCommaSeparated(values.cardScheme),
  );
  const [selectedExpressCheckout, setSelectedExpressCheckout] = useState<string[]>(() =>
    parseCommaSeparated(values.expressCheckout),
  );
  const [selectedAdditionalPaymentMethods, setSelectedAdditionalPaymentMethods] = useState<string[]>(() =>
    parseCommaSeparated(values.additionalPaymentMethods),
  );
  const [formValues, setFormValues] = useState(values);

  useEffect(() => {
    const clientId = values.clientId?.trim();
    const apiKey = values.apiKey?.trim();
    if (clientId && apiKey) {
      getPaymentMethodTypes({
        environment,
        clientId,
        apiKey,
      }).then((result) => {
        if (result.success) {
          setCardSchemes([...result.data.cardSchemes].sort());
          setExpressCheckoutPaymentMethods([...result.data.expressCheckoutPaymentMethods].sort());
          setAdditionalPaymentMethods([...result.data.additionalPaymentMethods].sort());
        }
      });
    }
  }, [environment, values.clientId, values.apiKey]);

  useEffect(() => {
    if (showVerifyAlert) {
      verifyAlertTimerRef.current = setTimeout(() => {
        setShowVerifyAlert(false);
      }, 5000);
      return () => {
        if (verifyAlertTimerRef.current) {
          clearTimeout(verifyAlertTimerRef.current);
        }
      };
    }
  }, [showVerifyAlert]);

  const resetFormValues = useCallback(() => {
    setFormValues(values);
    setSelectedCardSchemes(parseCommaSeparated(values.cardScheme));
    setSelectedExpressCheckout(parseCommaSeparated(values.expressCheckout));
    setSelectedAdditionalPaymentMethods(parseCommaSeparated(values.additionalPaymentMethods));
    setVerifyResult(null);
    setShowVerifyAlert(false);
  }, [values]);

  const handleAutoCaptureChange = useCallback((value: boolean) => {
    setFormValues((prev) => ({ ...prev, autoCapture: value }));
  }, []);

  const editDisabledByOther = isControlled && editingEnvironment !== null && editingEnvironment !== environment;

  const handleFieldChange = (field: keyof SettingsFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setVerifyResult(null);
    setShowVerifyAlert(false);
  };

  const handleEdit = () => {
    resetFormValues();
    if (isControlled) {
      onEditChange?.(environment);
    } else {
      setInternalEditing(true);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      resetFormValues();
      if (isControlled) {
        onEditChange?.(null);
      } else {
        setInternalEditing(false);
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSubmit({
        ...formValues,
        cardScheme: selectedCardSchemes.join(','),
        expressCheckout: selectedExpressCheckout.join(','),
        additionalPaymentMethods: selectedAdditionalPaymentMethods.join(','),
        autoCapture: formValues.autoCapture,
      });
      if (isControlled) {
        onEditChange?.(null);
      } else {
        setInternalEditing(false);
      }
    } catch {
      // Error alert shown by parent (e.g. AllEnvironmentsSettings)
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = useCallback(async () => {
    if (!onActivate) return;
    setIsLoading(true);
    try {
      await onActivate();
    } catch {
      // Error alert shown by parent
    } finally {
      setIsLoading(false);
    }
  }, [onActivate]);

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    setShowVerifyAlert(false);
    try {
      const result = await getPaymentMethodTypes({
        environment,
        clientId: formValues.clientId,
        apiKey: formValues.apiKey,
      });

      if (result.success) {
        setVerifyResult({ type: 'success', message: t('credentials.connectionSuccess') });
        setShowVerifyAlert(true);
        setCardSchemes([...result.data.cardSchemes].sort());
        setExpressCheckoutPaymentMethods([...result.data.expressCheckoutPaymentMethods].sort());
        setAdditionalPaymentMethods([...result.data.additionalPaymentMethods].sort());
      } else {
        setVerifyResult({ type: 'error', message: result.error ?? t('credentials.connectionFailed') });
        setShowVerifyAlert(true);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [environment, formValues.clientId, formValues.apiKey, t]);

  const body = useMemo(() => {
    const hasCardSchemes = cardSchemes.length > 0;
    const hasExpressCheckoutPaymentMethods = expressCheckoutPaymentMethods.length > 0;
    const hasAdditionalPaymentMethods = additionalPaymentMethods.length > 0;
    const hasPaymentMethodsAvailable =
      hasCardSchemes || hasExpressCheckoutPaymentMethods || hasAdditionalPaymentMethods;
    const isVerifyDisabled = !formValues.clientId?.trim() || !formValues.apiKey?.trim();

    if (isEditing) {
      return (
        <Fragment>
          <SectionIntro>
            <Headline variant="300">{t('credentials.title')}</Headline>
            <Body variant="subtle">{t('credentials.description')}</Body>
          </SectionIntro>
          <IdKeyContainer>
            <TextInput
              label={t('credentials.clientId')}
              value={formValues.clientId}
              onChange={(e) => handleFieldChange('clientId', e.target.value)}
            />
            <TextInput
              label={t('credentials.apiKey')}
              type="password"
              value={formValues.apiKey}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
            />
            <Button variant="secondary" onClick={handleVerify} disabled={isVerifyDisabled} loading={isVerifying}>
              {t('credentials.verify')}
            </Button>
          </IdKeyContainer>
          <TextInputHint>{t('credentials.hint')}</TextInputHint>
          {verifyResult && showVerifyAlert && (
            <VerifyAlert>
              <Alert subtle variant={verifyResult.type}>
                {verifyResult.message}
              </Alert>
            </VerifyAlert>
          )}
          <WebhookUrlContainer>
            <TextInput label={t('webhook.url')} value={window.endpoints.webhook} hint={t('webhook.urlHint')} forCopy />
          </WebhookUrlContainer>
          <WebhookSecretInput>
            <TextInput
              label={t('webhook.secret')}
              type="password"
              value={formValues.webhookSecret}
              onChange={(e) => handleFieldChange('webhookSecret', e.target.value)}
            />
          </WebhookSecretInput>
          {hasPaymentMethodsAvailable && (
            <>
              <SectionIntroWithMargin>
                <Headline variant="300">{t('paymentMethods.title')}</Headline>
                <Body variant="subtle">{t('paymentMethods.description')}</Body>
              </SectionIntroWithMargin>
              {hasCardSchemes && (
                <PaymentMethodsSection>
                  <Body variant="primary">{t('paymentMethods.cardSchemes')}</Body>
                  <PaymentMethodsContainer>
                    <PaymentMethodsCheck
                      options={cardSchemes.map((scheme) => ({ label: getPaymentMethodName(scheme), value: scheme }))}
                      value={selectedCardSchemes.filter((v) => cardSchemes.includes(v))}
                      onChange={setSelectedCardSchemes}
                    />
                  </PaymentMethodsContainer>
                </PaymentMethodsSection>
              )}
              {hasExpressCheckoutPaymentMethods && (
                <PaymentMethodsSection>
                  <Body variant="primary">{t('paymentMethods.expressCheckout')}</Body>
                  <PaymentMethodsContainer>
                    <PaymentMethodsCheck
                      options={expressCheckoutPaymentMethods.map((method) => ({
                        label: getPaymentMethodName(method),
                        value: method,
                      }))}
                      value={selectedExpressCheckout.filter((v) => expressCheckoutPaymentMethods.includes(v))}
                      onChange={setSelectedExpressCheckout}
                    />
                  </PaymentMethodsContainer>
                </PaymentMethodsSection>
              )}
              {hasAdditionalPaymentMethods && (
                <PaymentMethodsSection>
                  <Body variant="primary">{t('paymentMethods.additional')}</Body>
                  <PaymentMethodsContainer>
                    <PaymentMethodsSelect
                      options={additionalPaymentMethods.map((method) => ({
                        label: getPaymentMethodName(method),
                        value: method,
                      }))}
                      value={selectedAdditionalPaymentMethods.filter((v) => additionalPaymentMethods.includes(v))}
                      onChange={setSelectedAdditionalPaymentMethods}
                    />
                  </PaymentMethodsContainer>
                </PaymentMethodsSection>
              )}
            </>
          )}
          <SectionIntroWithMargin>
            <Headline variant="300">{t('captureMethod.title')}</Headline>
            <Body variant="subtle">{t('captureMethod.description')}</Body>
          </SectionIntroWithMargin>
          <PaymentMethodsSection>
            <AutoCaptureRadio value={formValues.autoCapture} onChange={handleAutoCaptureChange} />
          </PaymentMethodsSection>
        </Fragment>
      );
    }

    const showEmptyState = !values.clientId && !values.apiKey && emptyState !== undefined;

    if (showEmptyState) {
      return (
        <EmptyStateContainer>
          {emptyState.image && <EmptyStateImage>{emptyState.image}</EmptyStateImage>}
          {emptyState.title && (
            <EmptyStateTitle>
              <Body bold variant="primary">
                {emptyState.title}
              </Body>
            </EmptyStateTitle>
          )}
          {emptyState.description && <Body variant="subtle">{emptyState.description}</Body>}
        </EmptyStateContainer>
      );
    }

    const cardSchemeNames = parseCommaSeparated(values.cardScheme).sort();
    const expressCheckoutNames = parseCommaSeparated(values.expressCheckout).sort();
    const additionalPaymentMethodNames = parseCommaSeparated(values.additionalPaymentMethods).sort();

    return (
      <Fragment>
        <SettingLine>
          <Body>{t('credentials.clientId')}</Body>
          <Body bold variant="primary">
            {values.clientId}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>{t('credentials.apiKey')}</Body>
          <Body bold variant="primary">
            {maskString(values.apiKey)}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>{t('webhook.url')}</Body>
          <Body bold variant="primary">
            {window.endpoints.webhook}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>{t('webhook.secret')}</Body>
          <Body bold variant="primary">
            {maskString(values.webhookSecret)}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>{t('paymentMethods.cardSchemes')}</Body>
          {cardSchemeNames.length > 0 ? (
            <PaymentIconList names={cardSchemeNames} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>{t('paymentMethods.expressCheckout')}</Body>
          {expressCheckoutNames.length > 0 ? (
            <PaymentIconList names={expressCheckoutNames} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>{t('paymentMethods.additional')}</Body>
          {additionalPaymentMethodNames.length > 0 ? (
            <PaymentIconList names={additionalPaymentMethodNames} max={8} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>{t('captureMethod.title')}</Body>
          <Body bold variant="primary">
            {getAutoCaptureLabel(values.autoCapture)}
          </Body>
        </SettingLine>
      </Fragment>
    );
  }, [
    t,
    isEditing,
    formValues,
    values,
    emptyState,
    verifyResult,
    showVerifyAlert,
    cardSchemes,
    expressCheckoutPaymentMethods,
    additionalPaymentMethods,
    selectedCardSchemes,
    selectedExpressCheckout,
    selectedAdditionalPaymentMethods,
    handleVerify,
    handleAutoCaptureChange,
    isVerifying,
  ]);

  const clientIdChanged = formValues.clientId.trim() !== values.clientId.trim();
  const apiKeyChanged = formValues.apiKey.trim() !== values.apiKey.trim();
  const credentialsEitherChanged = clientIdChanged || apiKeyChanged;
  const credentialsEitherNotEmpty = formValues.clientId.trim() !== '' || formValues.apiKey.trim() !== '';
  const saveDisabled =
    credentialsEitherChanged && credentialsEitherNotEmpty && (!verifyResult || verifyResult.type !== 'success');

  const credentialsEmpty = !values.clientId?.trim() && !values.apiKey?.trim();

  return (
    <Card>
      <CardHeader
        css={
          isEditing
            ? css`
                position: sticky;
                top: -12px;
                z-index: 1;
                background: var(--color-white);
                border-radius: 6px 6px 0 0;
                overflow: hidden;
                isolation: isolate;
              `
            : undefined
        }
      >
        <SettingHeader
          title={
            activatedEnvironment != null && environment === activatedEnvironment ? (
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  gap: 12px;
                `}
              >
                {title}
                <Tag variant="green">{t('tag.active')}</Tag>
              </div>
            ) : (
              title
            )
          }
          description={description}
          editing={isEditing}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onSave={handleSave}
          loading={isLoading}
          saveDisabled={saveDisabled}
          editDisabled={editDisabledByOther}
          editDisabledTooltip={t('editDisabled.tooltip')}
          showActivate={!credentialsEmpty && activatedEnvironment != null && environment !== activatedEnvironment}
          activateButtonText={t('actions.activate', { environment: getEnvironmentName(environment) })}
          activateButtonVariant={activatedEnvironment != null ? 'secondary' : 'primary'}
          onActivate={handleActivate}
          editButtonText={credentialsEmpty ? t('actions.configure') : t('actions.edit')}
        />
      </CardHeader>
      <CardBody>{body}</CardBody>
    </Card>
  );
};

export default EnvironmentSettings;
