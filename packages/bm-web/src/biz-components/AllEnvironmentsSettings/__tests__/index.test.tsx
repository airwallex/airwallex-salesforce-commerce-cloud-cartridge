import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { saveSettings } from '@/api';
import AllEnvironmentsSettings from '@/biz-components/AllEnvironmentsSettings';
import { AlertProvider } from '@/contexts/AlertContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import type { Settings } from '@/contexts/settings';
import type { Environment } from '@/utils/environment';
import '@/utils/i18n';

jest.mock('@/api', () => ({
  saveSettings: jest.fn(),
}));

jest.mock('@/components/Modal', () => ({
  __esModule: true,
  default: ({
    open,
    onClose,
    onConfirm,
    title,
    confirmText,
  }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    confirmText?: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={() => void Promise.resolve(onConfirm()).catch(() => undefined)}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

jest.mock('@/biz-components/EnvironmentSettings', () => ({
  __esModule: true,
  default: function MockEnvironmentSettings({
    environment,
    editingEnvironment,
    onSubmit,
    onActivate,
    onEditChange,
  }: {
    environment: Environment;
    editingEnvironment?: Environment | null;
    onSubmit: (values: {
      clientId: string;
      apiKey: string;
      webhookSecret: string;
      cardScheme: string;
      expressCheckout: string;
      additionalPaymentMethods: string;
      autoCapture: boolean;
    }) => Promise<void>;
    onActivate?: () => Promise<void>;
    onEditChange?: (env: Environment | null) => void;
  }) {
    const form = {
      clientId: 'client-id',
      apiKey: 'api-key',
      webhookSecret: 'whsec',
      cardScheme: 'visa',
      expressCheckout: 'applepay',
      additionalPaymentMethods: 'klarna',
      autoCapture: false,
    };

    return (
      <div>
        <span data-testid={`editing-${environment}`}>{String(editingEnvironment)}</span>
        <button type="button" onClick={() => onEditChange?.(environment)}>
          edit-{environment}
        </button>
        <button type="button" onClick={() => onEditChange?.(null)}>
          cancel-{environment}
        </button>
        <button type="button" onClick={() => void Promise.resolve(onActivate?.()).catch(() => undefined)}>
          activate-{environment}
        </button>
        <button type="button" onClick={() => void onSubmit(form).catch(() => undefined)}>
          save-{environment}
        </button>
      </div>
    );
  },
}));

const saveSettingsMock = jest.mocked(saveSettings);

function businessManagerSettings(environment: 'demo' | 'production'): Settings {
  return {
    environment,
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
  };
}

function renderSettings(environment: 'demo' | 'production' = 'demo') {
  window.airwallexBusinessManager = businessManagerSettings(environment);
  return render(
    <SettingsProvider>
      <AlertProvider>
        <AllEnvironmentsSettings />
      </AlertProvider>
    </SettingsProvider>,
  );
}

describe('AllEnvironmentsSettings', () => {
  beforeEach(() => {
    saveSettingsMock.mockReset();
    saveSettingsMock.mockResolvedValue({ success: true, data: { success: true } });
  });

  it('saves one environment and shows a success alert', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'save-demo' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({
      awx_v1_client_id_demo: 'client-id',
      awx_v1_api_key_demo: 'api-key',
      awx_v1_webhook_secret_demo: 'whsec',
      awx_v1_card_scheme_demo: 'visa',
      awx_v1_express_checkout_demo: 'applepay',
      awx_v1_all_payment_methods_demo: 'klarna',
      awx_v1_auto_capture_demo: false,
    });
    expect(await screen.findByText('Sandbox settings saved successfully')).toBeInTheDocument();
  });

  it('shows the save error when submitting an environment fails', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    renderSettings('production');

    await user.click(screen.getByRole('button', { name: 'save-production' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        awx_v1_client_id_production: 'client-id',
        awx_v1_auto_capture_production: false,
      }),
    );
  });

  it('confirms production activation from the live-payments modal', async () => {
    const user = userEvent.setup();
    renderSettings('demo');

    await user.click(screen.getByRole('button', { name: 'activate-production' }));
    expect(screen.getByRole('dialog', { name: 'Enable live payments?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Activate Production' }));

    expect(saveSettingsMock).toHaveBeenCalledWith({ awx_v1_environment: 'production' });
    expect(await screen.findByText('Production environment activated')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the activation modal without saving', async () => {
    const user = userEvent.setup();
    renderSettings('demo');

    await user.click(screen.getByRole('button', { name: 'activate-production' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveSettingsMock).not.toHaveBeenCalled();
  });

  it('keeps the modal open and shows the fallback error when activation fails', async () => {
    const user = userEvent.setup();
    saveSettingsMock.mockResolvedValue({ success: false, error: undefined as unknown as string });
    renderSettings('production');

    await user.click(screen.getByRole('button', { name: 'activate-demo' }));
    await user.click(screen.getByRole('button', { name: 'Switch to Sandbox' }));

    expect(await screen.findByText('Failed to save settings')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Disable live payments?' })).toBeInTheDocument();
  });

  it('activates the current environment directly when no confirmation modal applies', async () => {
    const user = userEvent.setup();
    renderSettings('demo');

    await user.click(screen.getByRole('button', { name: 'activate-demo' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveSettingsMock).toHaveBeenCalledWith({ awx_v1_environment: 'demo' });
    expect(await screen.findByText('Sandbox environment activated')).toBeInTheDocument();
  });

  it('tracks which environment is being edited', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'edit-production' }));
    expect(screen.getByTestId('editing-demo')).toHaveTextContent('production');
    expect(screen.getByTestId('editing-production')).toHaveTextContent('production');

    await user.click(screen.getByRole('button', { name: 'cancel-production' }));
    expect(screen.getByTestId('editing-demo')).toHaveTextContent('null');
  });
});
