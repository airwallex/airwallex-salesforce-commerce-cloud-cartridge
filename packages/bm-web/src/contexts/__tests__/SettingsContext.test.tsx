import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsProvider } from '@/contexts/SettingsContext';
import { useSettings } from '@/hooks/useSettings';

const Probe = () => {
  const { settings, setSetting, setSettings } = useSettings();

  return (
    <div>
      <span data-testid="environment">{settings.environment}</span>
      <span data-testid="client-id">{settings.clientIdDemo}</span>
      <span data-testid="auto-capture">{String(settings.autoCaptureDemo)}</span>
      <span data-testid="analytics">{String(settings.analyticsEnabled)}</span>
      <button type="button" onClick={() => setSetting('clientIdDemo', 'updated-id')}>
        update
      </button>
      <button type="button" onClick={() => setSettings({ environment: 'production', analyticsEnabled: true })}>
        replace
      </button>
    </div>
  );
};

describe('SettingsProvider', () => {
  const originalConfig = window.airwallexBusinessManager;

  afterEach(() => {
    window.airwallexBusinessManager = originalConfig;
  });

  it('uses demo defaults when Business Manager config is missing', () => {
    delete (window as Partial<Window>).airwallexBusinessManager;

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('environment')).toHaveTextContent('demo');
    expect(screen.getByTestId('client-id')).toHaveTextContent('');
    expect(screen.getByTestId('auto-capture')).toHaveTextContent('true');
    expect(screen.getByTestId('analytics')).toHaveTextContent('false');
  });

  it('reads injected config, including explicit false booleans', () => {
    window.airwallexBusinessManager = {
      environment: 'production',
      clientIdDemo: 'demo-client',
      clientIdProduction: 'prod-client',
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
      autoCaptureDemo: false,
      autoCaptureProduction: false,
      analyticsEnabled: true,
    };

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('environment')).toHaveTextContent('production');
    expect(screen.getByTestId('client-id')).toHaveTextContent('demo-client');
    expect(screen.getByTestId('auto-capture')).toHaveTextContent('false');
    expect(screen.getByTestId('analytics')).toHaveTextContent('true');
  });

  it('updates one field and merges a partial settings object', async () => {
    const user = userEvent.setup();
    delete (window as Partial<Window>).airwallexBusinessManager;

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'update' }));
    expect(screen.getByTestId('client-id')).toHaveTextContent('updated-id');
    expect(screen.getByTestId('environment')).toHaveTextContent('demo');

    await user.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByTestId('environment')).toHaveTextContent('production');
    expect(screen.getByTestId('analytics')).toHaveTextContent('true');
    expect(screen.getByTestId('client-id')).toHaveTextContent('updated-id');
  });
});

describe('useSettingsContext', () => {
  it('throws when used outside SettingsProvider', () => {
    expect(() => render(<Probe />)).toThrow('useSettingsContext must be used within a SettingsProvider');
  });
});
