jest.mock('../configHelper', () => ({
  isAnalyticsEnabled: jest.fn(),
  getEnvironment: jest.fn(),
}));

jest.mock('../../airwallex/api/authentication', () => ({
  getCachedAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
}));

jest.mock('../../airwallex/airtracker/airTrackerClient', () => ({
  decodeAccountId: jest.fn(),
  sendEvents: jest.fn(),
}));

import configHelper from '../configHelper';
import authentication from '../../airwallex/api/authentication';
import airTrackerClient from '../../airwallex/airtracker/airTrackerClient';
import UUIDUtils = require('dw/util/UUIDUtils');
import { formatRemoteLogMessage, trackLog } from '../airTracker';

describe('airTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (configHelper.getEnvironment as jest.Mock).mockReturnValue('demo');
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue('cached-token');
    (authentication.getAccessToken as jest.Mock).mockReturnValue('fresh-token');
    (airTrackerClient.decodeAccountId as jest.Mock).mockReturnValue('acct_123');
    (airTrackerClient.sendEvents as jest.Mock).mockReturnValue({ success: true });
    (
      global as typeof globalThis & {
        session: { privacy: Record<string, unknown> };
      }
    ).session = {
      privacy: {},
    };
    (global as typeof globalThis & { request: { custom: Record<string, unknown> } }).request = {
      custom: {},
    };
  });

  it('does not send logs without merchant opt-in', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(false);

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(false);
    expect(airTrackerClient.sendEvents).not.toHaveBeenCalled();
  });

  it('sends an enabled log directly to AirTracker', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    expect(trackLog('error', 'sfcc_error', 'Payment failed')).toBe(true);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledWith(
      [{ severity: 'error', eventName: 'sfcc_error', message: 'Payment failed' }],
      {
        environment: 'demo',
        accountId: 'acct_123',
        siteId: 'TestSite',
        sessionId: 'test-uuid-1234-5678-9abc',
      },
    );
    expect(authentication.getCachedAccessToken).toHaveBeenCalledWith('demo');
    expect(authentication.getAccessToken).not.toHaveBeenCalled();
  });

  it('obtains an access token when the cache is empty before resolving the account ID', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue(null);
    (airTrackerClient.decodeAccountId as jest.Mock).mockImplementation(token => {
      return token === 'fresh-token' ? 'acct_fresh' : 'airTracker_unknown';
    });

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(true);
    expect(authentication.getAccessToken).toHaveBeenCalledWith('demo');
    expect(airTrackerClient.decodeAccountId).toHaveBeenCalledWith('fresh-token');
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1].accountId).toBe('acct_fresh');
  });

  it('does not recursively mirror logs emitted while obtaining an access token', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue(null);
    (authentication.getAccessToken as jest.Mock).mockImplementation(() => {
      expect(trackLog('info', 'sfcc_info', 'Access token obtained')).toBe(false);
      return 'fresh-token';
    });

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(true);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(1);
  });

  it('retries authentication on a later log after an earlier token failure', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue(null);
    (authentication.getAccessToken as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce('fresh-token');
    (airTrackerClient.decodeAccountId as jest.Mock).mockImplementation(token => {
      return token === 'fresh-token' ? 'acct_fresh' : 'airTracker_unknown';
    });

    trackLog('info', 'sfcc_info', 'Checkout started');
    trackLog('error', 'sfcc_error', 'Payment failed');

    expect(authentication.getAccessToken).toHaveBeenCalledTimes(2);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(2);
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[1][1].accountId).toBe('acct_fresh');
  });

  it('reuses the same AirTracker session ID for subsequent logs in the shopper session', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    trackLog('info', 'sfcc_info', 'Checkout started');
    trackLog('error', 'sfcc_error', 'Payment failed');

    const firstContext = (airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1];
    const secondContext = (airTrackerClient.sendEvents as jest.Mock).mock.calls[1][1];
    expect(firstContext.sessionId).toBe('test-uuid-1234-5678-9abc');
    expect(secondContext.sessionId).toBe(firstContext.sessionId);
    expect(UUIDUtils.createUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generated ID when session storage is unavailable', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    delete (global as typeof globalThis & { session?: unknown }).session;

    expect(trackLog('info', 'sfcc_info', 'Background job started')).toBe(true);
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1].sessionId).toBe('test-uuid-1234-5678-9abc');
  });

  it('recursively redacts credentials and nested SFCC form fields from remote logs', () => {
    expect(
      formatRemoteLogMessage('Payment handle called', {
        paymentInformation: {
          firstName: { value: 'Jane' },
          lastName: { value: 'Doe' },
          address1: { value: '1 Main Street' },
          email: { value: 'merchant@example.com' },
          phone: { value: '+61 412 345 678' },
          cardNumber: { value: '4111111111111111' },
        },
        paymentMethodId: 'AIRWALLEX_APM',
        apiKey: 'secret-key',
        awxPaymentIntentClientSecret: { value: 'intent-secret' },
        diagnosticMessage: 'Request failed authorization=Bearer token-123',
      }),
    ).toBe(
      'Payment handle called | {"paymentInformation":{"firstName":"[REDACTED]","lastName":"[REDACTED]","address1":"[REDACTED]","email":"[REDACTED]","phone":"[REDACTED]","cardNumber":"[REDACTED]"},"paymentMethodId":"AIRWALLEX_APM","apiKey":"[REDACTED]","awxPaymentIntentClientSecret":"[REDACTED]","diagnosticMessage":"Request failed authorization=\\"[REDACTED]\\""}',
    );
  });

  it('never propagates AirTracker failures to the application flow', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (airTrackerClient.sendEvents as jest.Mock).mockImplementation(() => {
      throw new Error('AirTracker unavailable');
    });

    expect(() => trackLog('error', 'sfcc_error', 'Payment failed')).not.toThrow();
    expect(trackLog('error', 'sfcc_error', 'Payment failed')).toBe(false);
  });
});
