const mockRenderTemplate = jest.fn();
const mockSetCustomPreference = jest.fn();
const mockFetchNewToken = jest.fn();
const mockQueryPaymentMethodTypesWithToken = jest.fn();
const mockGenerateCsrfToken = jest.fn(() => 'csrf-token');
const mockGetCsrfTokenName = jest.fn(() => 'csrf_token');
const mockValidateCsrfRequest = jest.fn(() => true);
const mockStartBufferedLogging = jest.fn(() => true);
const mockFlushBufferedLogs = jest.fn(() => true);
const mockSetBufferedLoggingContext = jest.fn(() => true);

jest.mock(
  'server',
  () => {
    throw new Error('AirwallexSettings must not load the SFRA server module');
  },
  { virtual: true },
);

jest.mock(
  'dw/template/ISML',
  () => ({
    renderTemplate: mockRenderTemplate,
  }),
  { virtual: true },
);

jest.mock(
  'dw/web/CSRFProtection',
  () => ({
    generateToken: mockGenerateCsrfToken,
    getTokenName: mockGetCsrfTokenName,
    validateRequest: mockValidateCsrfRequest,
  }),
  { virtual: true },
);

jest.mock(
  '@/cartridge/scripts/helpers/configHelper',
  () => ({
    setCustomPreference: mockSetCustomPreference,
  }),
  { virtual: true },
);

jest.mock(
  '@/cartridge/scripts/helpers/airwallexSettings',
  () => jest.requireActual('../../scripts/helpers/airwallexSettings'),
  { virtual: true },
);

jest.mock('@/cartridge/scripts/helpers/bmController', () => jest.requireActual('../../scripts/helpers/bmController'), {
  virtual: true,
});

jest.mock(
  '@/cartridge/scripts/helpers/airTracker',
  () => ({
    startBufferedLogging: mockStartBufferedLogging,
    flushBufferedLogs: mockFlushBufferedLogs,
    setBufferedLoggingContext: mockSetBufferedLoggingContext,
  }),
  { virtual: true },
);

jest.mock(
  '@/cartridge/scripts/airwallex/api/authentication',
  () => ({
    fetchNewToken: mockFetchNewToken,
  }),
  { virtual: true },
);

jest.mock(
  '@/cartridge/scripts/airwallex/api/merchantConfig',
  () => ({
    queryPaymentMethodTypesWithToken: mockQueryPaymentMethodTypesWithToken,
  }),
  { virtual: true },
);

interface PublicControllerAction {
  (): void;
  public: boolean;
}

interface ControllerModule {
  Start: PublicControllerAction;
  Save: PublicControllerAction;
  GetPaymentMethodTypes: PublicControllerAction;
}

interface MockResponse {
  setContentType: jest.Mock;
  setStatus: jest.Mock;
  writer: {
    print: jest.Mock;
  };
}

const controller = require('../AirwallexSettings') as ControllerModule;
const Transaction = require('dw/system/Transaction') as { wrap: jest.Mock };

function setRequest(body = '', overrides: { httpMethod?: string; isSecure?: boolean } = {}): void {
  Object.assign(globalThis, {
    request: {
      httpMethod: overrides.httpMethod ?? 'POST',
      httpParameterMap: {
        requestBodyAsString: body,
      },
      isHttpSecure: () => overrides.isSecure ?? true,
    },
  });
}

function setSession(isAuthenticated = true): void {
  Object.assign(globalThis, {
    session: {
      userAuthenticated: isAuthenticated,
    },
  });
}

function setResponse(): MockResponse {
  const mockResponse: MockResponse = {
    setContentType: jest.fn(),
    setStatus: jest.fn(),
    writer: {
      print: jest.fn(),
    },
  };
  Object.assign(globalThis, { response: mockResponse });
  return mockResponse;
}

function getJsonResponse(mockResponse: MockResponse): Record<string, unknown> {
  return JSON.parse(mockResponse.writer.print.mock.calls[0][0]) as Record<string, unknown>;
}

function expectJsonResponse(mockResponse: MockResponse, expected: Record<string, unknown>): void {
  expect(mockResponse.setContentType).toHaveBeenCalledWith('application/json');
  expect(mockResponse.writer.print).toHaveBeenCalledTimes(1);
  expect(getJsonResponse(mockResponse)).toEqual(expected);
}

describe('AirwallexSettings native Business Manager controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    setRequest();
    setResponse();
  });

  it('exposes all Business Manager actions as public controller functions', () => {
    expect(controller.Start.public).toBe(true);
    expect(controller.Save.public).toBe(true);
    expect(controller.GetPaymentMethodTypes.public).toBe(true);
  });

  it('renders the settings page for an authenticated Business Manager user', () => {
    setRequest('', { httpMethod: 'GET' });

    controller.Start();

    expect(mockRenderTemplate).toHaveBeenCalledWith('airwallexSettings/index', {
      csrfToken: 'csrf-token',
      csrfTokenName: 'csrf_token',
    });
  });

  it('buffers and flushes AirTracker logs around a Business Manager action', () => {
    setRequest('', { httpMethod: 'GET' });

    controller.Start();

    expect(mockStartBufferedLogging).toHaveBeenCalledTimes(1);
    expect(mockFlushBufferedLogs).toHaveBeenCalledTimes(1);
    expect(mockStartBufferedLogging.mock.invocationCallOrder[0]).toBeLessThan(
      mockRenderTemplate.mock.invocationCallOrder[0],
    );
    expect(mockRenderTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      mockFlushBufferedLogs.mock.invocationCallOrder[0],
    );
  });

  it('flushes AirTracker logs when a Business Manager action throws', () => {
    setRequest('', { httpMethod: 'GET' });
    mockRenderTemplate.mockImplementationOnce(() => {
      throw new Error('render failed');
    });

    expect(() => controller.Start()).toThrow('render failed');
    expect(mockFlushBufferedLogs).toHaveBeenCalledTimes(1);
  });

  it('rejects an unauthenticated settings page request', () => {
    setSession(false);
    const mockResponse = setResponse();

    controller.Start();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockRenderTemplate).not.toHaveBeenCalled();
  });

  it('rejects a non-GET settings page request', () => {
    const mockResponse = setResponse();

    controller.Start();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(405);
    expect(mockRenderTemplate).not.toHaveBeenCalled();
  });

  it('rejects an insecure settings page request', () => {
    setRequest('', { httpMethod: 'GET', isSecure: false });
    const mockResponse = setResponse();

    controller.Start();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockRenderTemplate).not.toHaveBeenCalled();
  });

  it('saves preferences from a secure POST request', () => {
    setRequest(JSON.stringify({ awx_v1_environment: 'demo', awx_v1_analytics_enabled: true }));
    const mockResponse = setResponse();

    controller.Save();

    expect(Transaction.wrap).toHaveBeenCalledTimes(1);
    expect(mockSetCustomPreference).toHaveBeenCalledWith('awx_v1_environment', 'demo');
    expect(mockSetCustomPreference).toHaveBeenCalledWith('awx_v1_analytics_enabled', true);
    expectJsonResponse(mockResponse, { success: true });
  });

  it('returns a failure response when preference JSON is malformed', () => {
    setRequest('{invalid-json');
    const mockResponse = setResponse();

    controller.Save();

    expect(mockSetCustomPreference).not.toHaveBeenCalled();
    expectJsonResponse(mockResponse, { success: false });
  });

  it.each([
    { payload: { unrelated_preference: 'value' }, description: 'an unknown preference key' },
    { payload: { awx_v1_analytics_enabled: 'true' }, description: 'an invalid preference value type' },
    { payload: { awx_v1_environment: 'staging' }, description: 'an invalid environment' },
  ])('rejects $description', ({ payload }) => {
    setRequest(JSON.stringify(payload));
    const mockResponse = setResponse();

    controller.Save();

    expect(Transaction.wrap).not.toHaveBeenCalled();
    expect(mockSetCustomPreference).not.toHaveBeenCalled();
    expectJsonResponse(mockResponse, { success: false });
  });

  it('returns a failure response when a preference write throws', () => {
    setRequest(JSON.stringify({ awx_v1_environment: 'demo' }));
    mockSetCustomPreference.mockImplementationOnce(() => {
      throw new Error('write failed');
    });
    const mockResponse = setResponse();

    controller.Save();

    expectJsonResponse(mockResponse, { success: false });
  });

  it('rejects Save when the request is not a POST', () => {
    setRequest('{}', { httpMethod: 'GET' });
    const mockResponse = setResponse();

    controller.Save();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(405);
    expect(mockSetCustomPreference).not.toHaveBeenCalled();
  });

  it('rejects Save when the request is not secure', () => {
    setRequest('{}', { isSecure: false });
    const mockResponse = setResponse();

    controller.Save();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockSetCustomPreference).not.toHaveBeenCalled();
  });

  it('rejects Save when CSRF validation fails', () => {
    setRequest(JSON.stringify({ awx_v1_environment: 'demo' }));
    mockValidateCsrfRequest.mockReturnValueOnce(false);
    const mockResponse = setResponse();

    controller.Save();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockSetCustomPreference).not.toHaveBeenCalled();
  });

  it('rejects Save for an unauthenticated user', () => {
    setSession(false);
    setRequest(JSON.stringify({ awx_v1_environment: 'demo' }));
    const mockResponse = setResponse();

    controller.Save();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockValidateCsrfRequest).not.toHaveBeenCalled();
    expect(mockSetCustomPreference).not.toHaveBeenCalled();
  });

  it('returns a validation error when payment method credentials are missing', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: '', apiKey: '' }));
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expectJsonResponse(mockResponse, {
      success: false,
      message: 'Missing required parameters: environment, clientId, and apiKey are required',
    });
    expect(mockFetchNewToken).not.toHaveBeenCalled();
  });

  it('returns an authentication error when credentials are rejected', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockFetchNewToken.mockReturnValue({ success: false });
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expectJsonResponse(mockResponse, {
      success: false,
      message: 'Failed to authenticate',
    });
  });

  it('rejects payment method discovery when CSRF validation fails', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockValidateCsrfRequest.mockReturnValueOnce(false);
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expect(mockResponse.setStatus).toHaveBeenCalledWith(403);
    expect(mockFetchNewToken).not.toHaveBeenCalled();
  });

  it('classifies payment methods and resource metadata', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockFetchNewToken.mockReturnValue({ success: true, data: { token: 'access-token' } });
    mockQueryPaymentMethodTypesWithToken.mockReturnValue({
      success: true,
      data: {
        items: [
          {
            name: 'card',
            display_name: 'Cards',
            resources: { logos: { svg: 'card.svg' } },
            card_schemes: [
              {
                name: 'visa',
                display_name: 'Visa',
                resources: { logos: { png: 'visa.png' } },
              },
            ],
          },
          { name: 'applepay', display_name: 'Apple Pay' },
          { name: 'wechatpay', display_name: 'WeChat Pay' },
        ],
      },
    });
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expect(mockFetchNewToken).toHaveBeenCalledWith('demo', 'client-id', 'api-key');
    expect(mockSetBufferedLoggingContext).toHaveBeenCalledWith('demo', 'access-token');
    expect(mockQueryPaymentMethodTypesWithToken).toHaveBeenCalledWith(
      { resources_needed: true },
      'demo',
      'access-token',
    );
    expectJsonResponse(mockResponse, {
      success: true,
      cardSchemes: ['visa'],
      expressCheckoutPaymentMethods: ['applepay'],
      additionalPaymentMethods: ['wechatpay'],
      resources: {
        card: { displayName: 'Cards', logoUrl: 'card.svg' },
        visa: { displayName: 'Visa', logoUrl: 'visa.png' },
        applepay: { displayName: 'Apple Pay', logoUrl: '' },
        wechatpay: { displayName: 'WeChat Pay', logoUrl: '' },
      },
    });
  });

  it('returns the API error when payment method discovery fails', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockFetchNewToken.mockReturnValue({ success: true, data: { token: 'access-token' } });
    mockQueryPaymentMethodTypesWithToken.mockReturnValue({
      success: false,
      error: { message: 'Payment method lookup failed' },
    });
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expectJsonResponse(mockResponse, {
      success: false,
      message: 'Payment method lookup failed',
    });
  });

  it('uses the fallback message when payment method discovery fails without an error', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockFetchNewToken.mockReturnValue({ success: true, data: { token: 'access-token' } });
    mockQueryPaymentMethodTypesWithToken.mockReturnValue({ success: false });
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expectJsonResponse(mockResponse, {
      success: false,
      message: 'Failed to fetch payment method types',
    });
  });

  it('returns an unexpected error response when payment method discovery throws', () => {
    setRequest(JSON.stringify({ environment: 'demo', clientId: 'client-id', apiKey: 'api-key' }));
    mockFetchNewToken.mockImplementationOnce(() => {
      throw new Error('authentication unavailable');
    });
    const mockResponse = setResponse();

    controller.GetPaymentMethodTypes();

    expectJsonResponse(mockResponse, {
      success: false,
      message: 'An unexpected error occurred',
    });
  });
});
