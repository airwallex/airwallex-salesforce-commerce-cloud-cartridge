import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@/utils/i18n';
import { saveSettings } from '@/api';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { useSettings } from '@/hooks/useSettings';
import type { Settings } from '@/contexts/settings';

jest.mock('@/api', () => ({
  saveSettings: jest.fn(),
}));

const saveSettingsMock = jest.mocked(saveSettings);

const fullSettings: Settings = {
  environment: 'demo',
  clientIdDemo: 'demo-client',
  clientIdProduction: 'prod-client',
  apiKeyDemo: 'demo-key',
  apiKeyProduction: 'prod-key',
  webhookSecretDemo: 'demo-secret',
  webhookSecretProduction: 'prod-secret',
  cardSchemeDemo: 'visa',
  cardSchemeProduction: 'mastercard',
  expressCheckoutDemo: 'applepay',
  expressCheckoutProduction: 'googlepay',
  enabledPaymentMethodsDemo: 'klarna',
  enabledPaymentMethodsProduction: 'ideal',
  autoCaptureDemo: false,
  autoCaptureProduction: true,
  analyticsEnabled: true,
};

function SubmitProbe() {
  const { getSetting, submitSettings } = useSettings();

  return (
    <div>
      <span data-testid="environment">{getSetting('environment')}</span>
      <button
        type="button"
        onClick={() =>
          void submitSettings().then((result) => {
            document.body.dataset.submit = JSON.stringify(result);
          })
        }
      >
        submit-all
      </button>
      <button
        type="button"
        onClick={() =>
          void submitSettings(['analyticsEnabled', 'environment'], { environment: 'production' }).then((result) => {
            document.body.dataset.submit = JSON.stringify(result);
          })
        }
      >
        submit-partial
      </button>
      <button
        type="button"
        onClick={() =>
          void submitSettings(['notAKey' as keyof Settings]).then((result) => {
            document.body.dataset.submit = JSON.stringify(result);
          })
        }
      >
        submit-unknown
      </button>
    </div>
  );
}

describe('useSettings', () => {
  const originalConfig = window.airwallexBusinessManager;

  beforeEach(() => {
    saveSettingsMock.mockReset();
    delete document.body.dataset.submit;
    window.airwallexBusinessManager = fullSettings;
  });

  afterEach(() => {
    window.airwallexBusinessManager = originalConfig;
  });

  it('reads a single setting through getSetting', () => {
    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('environment')).toHaveTextContent('demo');
  });

  it('submits every preference key mapped from the current settings', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: true, data: { success: true } });

    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'submit-all' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({
      awx_v1_environment: 'demo',
      awx_v1_client_id_demo: 'demo-client',
      awx_v1_client_id_production: 'prod-client',
      awx_v1_api_key_demo: 'demo-key',
      awx_v1_api_key_production: 'prod-key',
      awx_v1_webhook_secret_demo: 'demo-secret',
      awx_v1_webhook_secret_production: 'prod-secret',
      awx_v1_card_scheme_demo: 'visa',
      awx_v1_card_scheme_production: 'mastercard',
      awx_v1_express_checkout_demo: 'applepay',
      awx_v1_express_checkout_production: 'googlepay',
      awx_v1_all_payment_methods_demo: 'klarna',
      awx_v1_all_payment_methods_production: 'ideal',
      awx_v1_auto_capture_demo: false,
      awx_v1_auto_capture_production: true,
      awx_v1_analytics_enabled: true,
    });
    expect(document.body.dataset.submit).toBe(JSON.stringify({ success: true }));
  });

  it('submits only the requested keys and applies overrides to the payload', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: true, data: { success: true } });

    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'submit-partial' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({
      awx_v1_analytics_enabled: true,
      awx_v1_environment: 'production',
    });
    expect(screen.getByTestId('environment')).toHaveTextContent('demo');
  });

  it('returns the API error when save fails', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: 'Invalid credentials' });

    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'submit-all' }));

    expect(document.body.dataset.submit).toBe(JSON.stringify({ success: false, error: 'Invalid credentials' }));
  });

  it('falls back to the translated save error when the API omits a message', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: undefined as unknown as string });

    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'submit-all' }));

    expect(document.body.dataset.submit).toBe(JSON.stringify({ success: false, error: 'Failed to save settings' }));
  });

  it('ignores keys that are not mapped to a site preference', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: true, data: { success: true } });

    render(
      <SettingsProvider>
        <SubmitProbe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'submit-unknown' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({});
  });
});
