import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { saveSettings } from '@/api';
import AnalyticsSettings from '@/biz-components/AnalyticsSettings';
import { AlertProvider } from '@/contexts/AlertContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import type { Settings } from '@/contexts/settings';
import '@/utils/i18n';

jest.mock('@/api', () => ({
  saveSettings: jest.fn(),
}));

const saveSettingsMock = jest.mocked(saveSettings);

const settings = {
  environment: 'demo',
  clientIdDemo: '',
  clientIdProduction: '',
  apiKeyDemo: '',
  apiKeyProduction: '',
  webhookSecretDemo: '',
  webhookSecretProduction: '',
  cardSchemeDemo: '',
  cardSchemeProduction: '',
  expressCheckoutDemo: '',
  expressCheckoutProduction: '',
  enabledPaymentMethodsDemo: '',
  enabledPaymentMethodsProduction: '',
  autoCaptureDemo: true,
  autoCaptureProduction: true,
  analyticsEnabled: false,
} satisfies Settings;

function renderAnalytics() {
  window.airwallexBusinessManager = settings;
  return render(
    <SettingsProvider>
      <AlertProvider>
        <AnalyticsSettings />
      </AlertProvider>
    </SettingsProvider>,
  );
}

describe('AnalyticsSettings', () => {
  beforeEach(() => {
    saveSettingsMock.mockReset();
  });

  it('saves analytics as enabled and shows a success alert', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: true, data: { success: true } });
    renderAnalytics();

    await user.click(screen.getByRole('switch', { name: 'Toggle switch' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({ awx_v1_analytics_enabled: true });
    expect(await screen.findByText('Analytics settings saved successfully')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Toggle switch' })).toBeChecked();
  });

  it('shows the API error and leaves the switch unchanged when save fails', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: 'Could not save' });
    renderAnalytics();

    await user.click(screen.getByRole('switch', { name: 'Toggle switch' }));

    expect(await screen.findByText('Could not save')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Toggle switch' })).not.toBeChecked();
  });

  it('falls back to the generic save error when the API omits a message', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: undefined as unknown as string });
    renderAnalytics();

    await user.click(screen.getByRole('switch', { name: 'Toggle switch' }));

    expect(await screen.findByText('Failed to save settings')).toBeInTheDocument();
  });
});
