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
import {
  flushBufferedLogs,
  formatRemoteLogMessage,
  setBufferedLoggingContext,
  startBufferedLogging,
  trackLog,
} from '../airTracker';

describe('airTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (configHelper.getEnvironment as jest.Mock).mockReturnValue('demo');
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue('cached-token');
    (authentication.getAccessToken as jest.Mock).mockReturnValue('fresh-token');
    (airTrackerClient.decodeAccountId as jest.Mock).mockReturnValue('acct_123');
    (airTrackerClient.sendEvents as jest.Mock).mockReturnValue({ success: true });
    (UUIDUtils.createUUID as jest.Mock).mockReset().mockReturnValue('test-uuid-1234-5678-9abc');
    (
      global as typeof globalThis & {
        session: { privacy: Record<string, unknown> };
      }
    ).session = {
      privacy: {},
    };
    (
      global as typeof globalThis & {
        request: { requestID: string; custom: Record<string, unknown> };
      }
    ).request = {
      requestID: 'request-1',
      custom: {},
    };
    startBufferedLogging();
  });

  it('does not send logs without merchant opt-in', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(false);

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(false);
    expect(airTrackerClient.sendEvents).not.toHaveBeenCalled();
  });

  it('buffers enabled logs and sends them in one ordered batch on flush', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(true);
    expect(trackLog('error', 'sfcc_error', 'Payment failed')).toBe(true);
    expect(airTrackerClient.sendEvents).not.toHaveBeenCalled();

    expect(flushBufferedLogs()).toBe(true);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledWith(
      [
        { severity: 'info', eventName: 'sfcc_info', message: 'Checkout started' },
        { severity: 'error', eventName: 'sfcc_error', message: 'Payment failed' },
      ],
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

  it('uses the unknown account without fetching a token when the cache is empty', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (authentication.getCachedAccessToken as jest.Mock).mockReturnValue(null);
    (airTrackerClient.decodeAccountId as jest.Mock).mockReturnValue('airTracker_unknown');

    trackLog('info', 'sfcc_info', 'Checkout started');
    expect(flushBufferedLogs()).toBe(true);

    expect(authentication.getAccessToken).not.toHaveBeenCalled();
    expect(airTrackerClient.decodeAccountId).toHaveBeenCalledWith(null);
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1].accountId).toBe('airTracker_unknown');
  });

  it('uses an execution-scoped environment and account from explicit credentials', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (airTrackerClient.decodeAccountId as jest.Mock).mockReturnValue('acct_business_manager');

    trackLog('info', 'sfcc_info', 'Testing Business Manager credentials');
    expect(setBufferedLoggingContext('production', 'business-manager-token')).toBe(true);
    expect(flushBufferedLogs()).toBe(true);

    expect(airTrackerClient.decodeAccountId).toHaveBeenCalledWith('business-manager-token');
    expect(authentication.getCachedAccessToken).not.toHaveBeenCalled();
    expect(airTrackerClient.sendEvents).toHaveBeenCalledWith(expect.any(Array), {
      environment: 'production',
      accountId: 'acct_business_manager',
      siteId: 'TestSite',
      sessionId: 'test-uuid-1234-5678-9abc',
    });
  });

  it('does not send a second batch when flush is called repeatedly', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    trackLog('info', 'sfcc_info', 'Checkout started');
    expect(flushBufferedLogs()).toBe(true);
    expect(trackLog('info', 'sfcc_info', 'Rendered response')).toBe(false);
    expect(flushBufferedLogs()).toBe(true);

    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(1);
  });

  it('drops the batch safely when the Airwallex environment is unavailable', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (configHelper.getEnvironment as jest.Mock).mockReturnValue(null);

    trackLog('info', 'sfcc_info', 'Checkout started');

    expect(flushBufferedLogs()).toBe(false);
    expect(airTrackerClient.sendEvents).not.toHaveBeenCalled();
  });

  it('does not retry a failed batch during the same request', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (airTrackerClient.sendEvents as jest.Mock).mockReturnValue({ success: false, error: 'rate limited' });

    trackLog('info', 'sfcc_info', 'Checkout started');
    expect(flushBufferedLogs()).toBe(false);
    expect(flushBufferedLogs()).toBe(true);

    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(1);
  });

  it('reuses the same AirTracker session ID across request batches in the shopper session', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    trackLog('info', 'sfcc_info', 'Checkout started');
    flushBufferedLogs();
    startBufferedLogging();
    trackLog('error', 'sfcc_error', 'Payment failed');
    flushBufferedLogs();

    const firstContext = (airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1];
    const secondContext = (airTrackerClient.sendEvents as jest.Mock).mock.calls[1][1];
    expect(firstContext.sessionId).toBe('test-uuid-1234-5678-9abc');
    expect(secondContext.sessionId).toBe(firstContext.sessionId);
    expect(UUIDUtils.createUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generated ID when session storage is unavailable', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    delete (global as typeof globalThis & { session?: unknown }).session;

    trackLog('info', 'sfcc_info', 'Background job started');
    expect(flushBufferedLogs()).toBe(true);
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1].sessionId).toBe('test-uuid-1234-5678-9abc');
  });

  it('buffers logs without relying on request-scoped custom attributes', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    delete (global as typeof globalThis & { request?: unknown }).request;
    startBufferedLogging();

    expect(trackLog('info', 'sfcc_info', 'Checkout started')).toBe(true);
    expect(flushBufferedLogs()).toBe(true);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(1);
  });

  it('discards stale buffered events when a new execution starts', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    trackLog('info', 'sfcc_info', 'Stale event');

    startBufferedLogging();
    trackLog('error', 'sfcc_error', 'Current event');
    expect(flushBufferedLogs()).toBe(true);

    expect(airTrackerClient.sendEvents).toHaveBeenCalledWith(
      [{ severity: 'error', eventName: 'sfcc_error', message: 'Current event' }],
      expect.any(Object),
    );
  });

  it('never propagates buffer initialization failures', () => {
    delete (global as typeof globalThis & { request?: unknown }).request;
    (UUIDUtils.createUUID as jest.Mock).mockImplementation(() => {
      throw new Error('UUID unavailable');
    });

    expect(startBufferedLogging()).toBe(false);
  });

  it('keeps overlapping request buffers isolated by request ID', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);

    startBufferedLogging();
    trackLog('info', 'sfcc_info', 'First request');

    (global as typeof globalThis & { request: { requestID: string } }).request = { requestID: 'request-2' };
    startBufferedLogging();
    trackLog('error', 'sfcc_error', 'Second request');
    flushBufferedLogs();

    (global as typeof globalThis & { request: { requestID: string } }).request = { requestID: 'request-1' };
    flushBufferedLogs();

    expect(airTrackerClient.sendEvents).toHaveBeenNthCalledWith(
      1,
      [{ severity: 'error', eventName: 'sfcc_error', message: 'Second request' }],
      expect.any(Object),
    );
    expect(airTrackerClient.sendEvents).toHaveBeenNthCalledWith(
      2,
      [{ severity: 'info', eventName: 'sfcc_info', message: 'First request' }],
      expect.any(Object),
    );
  });

  it('keeps explicit tracking contexts isolated by request ID', () => {
    (configHelper.isAnalyticsEnabled as jest.Mock).mockReturnValue(true);
    (airTrackerClient.decodeAccountId as jest.Mock)
      .mockReturnValueOnce('acct_first')
      .mockReturnValueOnce('acct_second');

    setBufferedLoggingContext('demo', 'first-token');
    trackLog('info', 'sfcc_info', 'First request');

    (global as typeof globalThis & { request: { requestID: string } }).request = { requestID: 'request-2' };
    startBufferedLogging();
    setBufferedLoggingContext('production', 'second-token');
    trackLog('info', 'sfcc_info', 'Second request');
    flushBufferedLogs();

    (global as typeof globalThis & { request: { requestID: string } }).request = { requestID: 'request-1' };
    flushBufferedLogs();

    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({ environment: 'production', accountId: 'acct_second' }),
    );
    expect((airTrackerClient.sendEvents as jest.Mock).mock.calls[1][1]).toEqual(
      expect.objectContaining({ environment: 'demo', accountId: 'acct_first' }),
    );
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
    expect(() => flushBufferedLogs()).not.toThrow();
    expect(flushBufferedLogs()).toBe(true);
    expect(airTrackerClient.sendEvents).toHaveBeenCalledTimes(1);
  });
});
