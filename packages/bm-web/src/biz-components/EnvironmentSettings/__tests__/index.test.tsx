import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getPaymentMethodTypes } from '@/api';
import EnvironmentSettings, { type SettingsFormValues } from '@/biz-components/EnvironmentSettings';
import { AlertProvider } from '@/contexts/AlertContext';
import '@/utils/i18n';

jest.mock('@/api', () => ({
  getPaymentMethodTypes: jest.fn(),
}));

jest.mock('@/components/PaymentIcon', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

const getPaymentMethodTypesMock = jest.mocked(getPaymentMethodTypes);

const emptyValues: SettingsFormValues = {
  clientId: '',
  apiKey: '',
  webhookSecret: '',
  cardScheme: '',
  expressCheckout: '',
  additionalPaymentMethods: '',
  autoCapture: true,
};

const savedValues: SettingsFormValues = {
  ...emptyValues,
  clientId: 'demo-client',
  apiKey: 'secret-key',
  webhookSecret: 'whsec',
  cardScheme: ' Visa, Mastercard ',
  expressCheckout: 'ApplePay, , googlepay',
  autoCapture: false,
};

const successPayload = {
  success: true as const,
  data: {
    cardSchemes: ['mastercard', 'visa'],
    expressCheckoutPaymentMethods: ['applepay'],
    additionalPaymentMethods: ['klarna'],
    resources: {},
  },
};

function renderSettings(overrides: Partial<React.ComponentProps<typeof EnvironmentSettings>> = {}) {
  return render(
    <AlertProvider>
      <EnvironmentSettings
        environment="demo"
        title="Sandbox settings"
        description="Test payment flows"
        values={emptyValues}
        onSubmit={jest.fn()}
        emptyState={{
          title: 'Configure Sandbox',
          description: 'Add your credentials to simulate checkout.',
        }}
        {...overrides}
      />
    </AlertProvider>,
  );
}

function field(label: string): HTMLInputElement {
  const labelNode = screen.getByText(label);
  const input = labelNode.parentElement?.querySelector('input');
  if (!input) {
    throw new Error(`No input found for ${label}`);
  }
  return input;
}

function controlFor(label: string, type: 'checkbox' | 'radio'): HTMLElement {
  const labelNode = screen.getByText(label);
  const input = labelNode.parentElement?.parentElement?.querySelector(`input[type="${type}"]`);
  if (!(input instanceof HTMLElement)) {
    throw new Error(`No ${type} found for ${label}`);
  }
  return input;
}

describe('EnvironmentSettings', () => {
  beforeEach(() => {
    getPaymentMethodTypesMock.mockReset();
    getPaymentMethodTypesMock.mockResolvedValue(successPayload);
    window.endpoints = {
      save: '/save',
      webhook: 'https://hooks.example/awx',
      getPaymentMethodTypes: '/payment-method-types',
    };
  });

  it('shows the empty state and does not fetch payment methods when credentials are missing', () => {
    renderSettings();

    expect(screen.getByText('Configure Sandbox')).toBeInTheDocument();
    expect(screen.getByText('Add your credentials to simulate checkout.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure' })).toBeInTheDocument();
    expect(getPaymentMethodTypesMock).not.toHaveBeenCalled();
  });

  it('shows saved credentials and parses comma-separated payment methods', async () => {
    renderSettings({ values: savedValues, emptyState: undefined });

    expect(screen.getByText('demo-client')).toBeInTheDocument();
    expect(screen.getByText('••••••••••')).toBeInTheDocument();
    expect(screen.getByText('https://hooks.example/awx')).toBeInTheDocument();
    expect(screen.getByText('mastercard')).toBeInTheDocument();
    expect(screen.getByText('visa')).toBeInTheDocument();
    expect(screen.getByText('applepay')).toBeInTheDocument();
    expect(screen.getByText('googlepay')).toBeInTheDocument();
    expect(screen.getByText('Authorise only')).toBeInTheDocument();
    expect(await screen.findAllByText('-')).toHaveLength(1);

    expect(getPaymentMethodTypesMock).toHaveBeenCalledWith({
      environment: 'demo',
      clientId: 'demo-client',
      apiKey: 'secret-key',
    });
  });

  it('keeps Verify disabled until both credentials are present, then shows a successful connection', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Configure' }));

    const verify = screen.getByRole('button', { name: 'Verify' });
    expect(verify).toBeDisabled();

    await user.type(field('Client ID'), 'client-id');
    expect(verify).toBeDisabled();

    await user.type(field('API Key'), 'api-key');
    expect(verify).toBeEnabled();

    await user.click(verify);

    expect(await screen.findByText('Connection successful')).toBeInTheDocument();
    expect(getPaymentMethodTypesMock).toHaveBeenCalledWith({
      environment: 'demo',
      clientId: 'client-id',
      apiKey: 'api-key',
    });
    expect(screen.getByText('VISA')).toBeInTheDocument();
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
    expect(screen.getByText('Additional payment methods')).toBeInTheDocument();
  });

  it('shows the API error when verification fails, and the generic message when none is returned', async () => {
    const user = userEvent.setup();
    getPaymentMethodTypesMock.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    renderSettings({
      values: { ...emptyValues, clientId: 'client-id', apiKey: 'api-key' },
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

    getPaymentMethodTypesMock.mockResolvedValue({ success: false, error: undefined as unknown as string });
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Connection failed')).toBeInTheDocument();
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
  });

  it('clears the verification result when a credential changes and restores the saved view on cancel', async () => {
    const user = userEvent.setup();
    renderSettings({ values: savedValues, emptyState: undefined });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Connection successful')).toBeInTheDocument();

    await user.type(field('Client ID'), 'x');
    expect(screen.queryByText('Connection successful')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('demo-client')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('saves the toggled payment methods and capture setting, then leaves edit mode', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderSettings({ values: savedValues, emptyState: undefined, onSubmit });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(controlFor('VISA', 'checkbox'));
    await user.click(controlFor('Apple Pay', 'checkbox'));
    await user.click(controlFor('Authorise & capture', 'radio'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      ...savedValues,
      cardScheme: 'mastercard',
      expressCheckout: '',
      additionalPaymentMethods: '',
      autoCapture: true,
    });
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('stays in edit mode when save fails', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockRejectedValue(new Error('save failed'));
    renderSettings({ values: savedValues, emptyState: undefined, onSubmit });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('requires a successful verification before saving changed credentials', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderSettings({ values: savedValues, emptyState: undefined, onSubmit });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(field('Client ID'), 'x');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Connection successful')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'demo-clientx' }));
  });

  it('activates a different environment and hides activation when this environment is already active', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn().mockResolvedValue(undefined);
    const { unmount } = renderSettings({
      values: savedValues,
      emptyState: undefined,
      activatedEnvironment: 'production',
      onActivate,
    });

    await user.click(screen.getByRole('button', { name: 'Activate Sandbox' }));
    expect(onActivate).toHaveBeenCalled();
    unmount();

    renderSettings({
      values: savedValues,
      emptyState: undefined,
      activatedEnvironment: 'demo',
      onActivate,
    });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate Sandbox' })).not.toBeInTheDocument();
  });

  it('hides activation for empty credentials and ignores a click when no handler is provided', async () => {
    const user = userEvent.setup();
    const { unmount } = renderSettings({
      activatedEnvironment: 'production',
    });
    expect(screen.queryByRole('button', { name: 'Activate Sandbox' })).not.toBeInTheDocument();
    unmount();

    renderSettings({
      values: savedValues,
      emptyState: undefined,
      activatedEnvironment: 'production',
    });
    await user.click(screen.getByRole('button', { name: 'Activate Sandbox' }));
    expect(screen.getByText('demo-client')).toBeInTheDocument();
  });

  it('disables editing while another environment is open and reports cancel to the parent', async () => {
    const user = userEvent.setup();
    const onEditChange = jest.fn();
    const { unmount } = renderSettings({
      values: savedValues,
      emptyState: undefined,
      editingEnvironment: 'production',
      onEditChange,
    });

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    unmount();

    renderSettings({
      values: savedValues,
      emptyState: undefined,
      editingEnvironment: 'demo',
      onEditChange,
    });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onEditChange).toHaveBeenCalledWith(null);
  });
});
