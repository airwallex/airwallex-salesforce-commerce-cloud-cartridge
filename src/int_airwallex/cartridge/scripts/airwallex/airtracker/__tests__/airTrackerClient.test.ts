jest.mock('../airTrackerService', () => ({
  getAirTrackerService: jest.fn(),
}));

import { VERSION } from '../../../constants/appConfig';
import airTrackerService from '../airTrackerService';
import { AIRTRACKER_APP_NAME, decodeAccountId, sendEvents } from '../airTrackerClient';

const encodeBase64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

describe('airTrackerClient', () => {
  const call = jest.fn();
  const context = {
    environment: 'demo' as const,
    accountId: 'acct_123',
    siteId: 'TestSite',
    sessionId: 'test-session-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (airTrackerService.getAirTrackerService as jest.Mock).mockReturnValue({ call });
    call.mockReturnValue({
      status: 'OK',
      object: {
        statusCode: 200,
        text: 'ok',
        errorText: '',
      },
    });
  });

  it('decodes the account ID from an Airwallex access token', () => {
    const token = `${encodeBase64Url({ alg: 'none' })}.${encodeBase64Url({ account_id: 'acct_123' })}.signature`;

    expect(decodeAccountId(token)).toBe('acct_123');
  });

  it('falls back when the access token cannot be decoded', () => {
    expect(decodeAccountId('invalid-token')).toBe('airTracker_unknown');
  });

  it('sends a batch using the AirTracker 3.x payload contract', () => {
    const events = [
      {
        severity: 'error' as const,
        eventName: 'sfcc_error',
        message: 'Payment creation failed',
      },
    ];

    expect(sendEvents(events, context)).toEqual({ success: true });
    expect(call).toHaveBeenCalledWith({
      commonData: {
        accountId: 'acct_123',
        appName: AIRTRACKER_APP_NAME,
        source: 'salesforce',
        deviceId: 'unknown',
        sessionId: 'test-session-id',
        appVersion: VERSION,
        platform: 'other',
        env: 'demo',
        siteId: 'TestSite',
      },
      data: events,
    });
  });

  it('returns a failure without throwing when the service call fails', () => {
    call.mockReturnValue({ status: 'ERROR', errorMessage: 'timeout' });

    expect(
      sendEvents([{ severity: 'error', eventName: 'sfcc_error', message: 'Payment creation failed' }], context),
    ).toEqual({
      success: false,
      error: 'timeout',
    });
  });
});
