import { useState, Fragment, useMemo, useCallback, useEffect } from 'react';
import { css } from '@emotion/react';

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
  const [internalEditing, setInternalEditing] = useState(false);
  const isControlled = editingEnvironment !== undefined && onEditChange !== undefined;
  const isEditing = isControlled ? editingEnvironment === environment : internalEditing;
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
          setCardSchemes(result.data.cardSchemes);
          setExpressCheckoutPaymentMethods(result.data.expressCheckoutPaymentMethods);
          setAdditionalPaymentMethods(result.data.additionalPaymentMethods);
        }
      });
    }
  }, [environment, values.clientId, values.apiKey]);

  const resetFormValues = useCallback(() => {
    setFormValues(values);
    setSelectedCardSchemes(parseCommaSeparated(values.cardScheme));
    setSelectedExpressCheckout(parseCommaSeparated(values.expressCheckout));
    setSelectedAdditionalPaymentMethods(parseCommaSeparated(values.additionalPaymentMethods));
    setVerifyResult(null);
  }, [values]);

  const handleAutoCaptureChange = useCallback((value: boolean) => {
    setFormValues((prev) => ({ ...prev, autoCapture: value }));
  }, []);

  // Reset form when another EnvironmentSettings takes over editing
  useEffect(() => {
    if (isControlled && editingEnvironment !== null && editingEnvironment !== environment) {
      resetFormValues();
    }
  }, [isControlled, editingEnvironment, environment, resetFormValues]);

  const handleFieldChange = (field: keyof SettingsFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setVerifyResult(null);
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
    try {
      const result = await getPaymentMethodTypes({
        environment,
        clientId: formValues.clientId,
        apiKey: formValues.apiKey,
      });

      if (result.success) {
        setVerifyResult({ type: 'success', message: 'Connection successful' });
        setCardSchemes(result.data.cardSchemes);
        setExpressCheckoutPaymentMethods(result.data.expressCheckoutPaymentMethods);
        setAdditionalPaymentMethods(result.data.additionalPaymentMethods);
      } else {
        setVerifyResult({ type: 'error', message: result.error ?? 'Connection failed' });
      }
    } finally {
      setIsVerifying(false);
    }
  }, [environment, formValues.clientId, formValues.apiKey]);

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
            <Headline variant="300">Environment credentials</Headline>
            <Body variant="subtle">Connect your Airwallex account to process payments and sync data</Body>
          </SectionIntro>
          <IdKeyContainer>
            <TextInput
              label="Client ID"
              value={formValues.clientId}
              onChange={(e) => handleFieldChange('clientId', e.target.value)}
            />
            <TextInput
              label="API Key"
              type="password"
              value={formValues.apiKey}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
            />
            <Button variant="secondary" onClick={handleVerify} disabled={isVerifyDisabled} loading={isVerifying}>
              Verify
            </Button>
          </IdKeyContainer>
          <TextInputHint>Generate credentials in Airwallex Developer settings.</TextInputHint>
          {verifyResult && (
            <VerifyAlert>
              <Alert subtle variant={verifyResult.type}>
                {verifyResult.message}
              </Alert>
            </VerifyAlert>
          )}
          <WebhookUrlContainer>
            <TextInput
              label="Webhook URL"
              value={window.endpoints.webhook}
              hint="Copy this URL and paste it into Airwallex settings to generate your webhook secret key"
              forCopy
            />
          </WebhookUrlContainer>
          <WebhookSecretInput>
            <TextInput
              label="Webhook Secret"
              type="password"
              value={formValues.webhookSecret}
              onChange={(e) => handleFieldChange('webhookSecret', e.target.value)}
            />
          </WebhookSecretInput>
          {hasPaymentMethodsAvailable && (
            <>
              <SectionIntroWithMargin>
                <Headline variant="300">Payment methods</Headline>
                <Body variant="subtle">Select the payment options to display at checkout</Body>
              </SectionIntroWithMargin>
              {hasCardSchemes && (
                <PaymentMethodsSection>
                  <Body variant="primary">Card schemes</Body>
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
                  <Body variant="primary">Express checkout</Body>
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
                  <Body variant="primary">Additional payment methods</Body>
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
            <Headline variant="300">Payment capture method</Headline>
            <Body variant="subtle">
              If &quot;Authorize only&quot; is selected, you will need to manually capture the funds in Airwallex.
              Payments made using methods that don't support hold will still be automatically captured.
            </Body>
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

    const cardSchemeNames = parseCommaSeparated(values.cardScheme);
    const expressCheckoutNames = parseCommaSeparated(values.expressCheckout);
    const additionalPaymentMethodNames = parseCommaSeparated(values.additionalPaymentMethods);

    return (
      <Fragment>
        <SettingLine>
          <Body>Client ID</Body>
          <Body bold variant="primary">
            {values.clientId}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>API Key</Body>
          <Body bold variant="primary">
            {maskString(values.apiKey)}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>Webhook URL</Body>
          <Body bold variant="primary">
            {window.endpoints.webhook}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>Webhook Secret</Body>
          <Body bold variant="primary">
            {maskString(values.webhookSecret)}
          </Body>
        </SettingLine>
        <SettingLine>
          <Body>Card schemes</Body>
          {cardSchemeNames.length > 0 ? (
            <PaymentIconList names={cardSchemeNames} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>Express checkout</Body>
          {expressCheckoutNames.length > 0 ? (
            <PaymentIconList names={expressCheckoutNames} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>Additional payment methods</Body>
          {additionalPaymentMethodNames.length > 0 ? (
            <PaymentIconList names={additionalPaymentMethodNames} max={8} />
          ) : (
            <Body bold variant="primary">
              -
            </Body>
          )}
        </SettingLine>
        <SettingLine>
          <Body>Payment capture method</Body>
          <Body bold variant="primary">
            {getAutoCaptureLabel(values.autoCapture)}
          </Body>
        </SettingLine>
      </Fragment>
    );
  }, [
    isEditing,
    formValues,
    values,
    emptyState,
    verifyResult,
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
                <Tag variant="green">Active</Tag>
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
          showActivate={!credentialsEmpty && activatedEnvironment != null && environment !== activatedEnvironment}
          activateButtonText={`Activate ${getEnvironmentName(environment)}`}
          activateButtonVariant={activatedEnvironment != null ? 'secondary' : 'primary'}
          onActivate={handleActivate}
          editButtonText={credentialsEmpty ? 'Configure' : 'Edit'}
        />
      </CardHeader>
      <CardBody>{body}</CardBody>
    </Card>
  );
};

export default EnvironmentSettings;
