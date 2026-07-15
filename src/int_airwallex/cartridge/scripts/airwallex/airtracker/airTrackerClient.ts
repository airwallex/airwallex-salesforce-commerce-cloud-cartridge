/**
 * Builds and submits AirTracker log events.
 */

import StringUtils = require('dw/util/StringUtils');
import { VERSION } from '../../constants/appConfig';
import { getAirTrackerService } from './airTrackerService';
import type {
  AirTrackerContext,
  AirTrackerEvent,
  AirTrackerPayload,
  AirTrackerSendResult,
  AirTrackerServiceResponse,
} from './types';

const AIRTRACKER_APP_NAME = 'sfcc-payment-plugin';
const UNKNOWN_ACCOUNT_ID = 'airTracker_unknown';

const decodeAccountId = (token: string | null): string => {
  if (!token) {
    return UNKNOWN_ACCOUNT_ID;
  }

  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return UNKNOWN_ACCOUNT_ID;
    }

    let encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (encodedPayload.length % 4 !== 0) {
      encodedPayload += '=';
    }

    const payload = JSON.parse(StringUtils.decodeBase64(encodedPayload, 'UTF-8')) as { account_id?: string };
    return payload.account_id || UNKNOWN_ACCOUNT_ID;
  } catch {
    return UNKNOWN_ACCOUNT_ID;
  }
};

const buildPayload = (events: AirTrackerEvent[], context: AirTrackerContext): AirTrackerPayload => {
  return {
    commonData: {
      accountId: context.accountId,
      appName: AIRTRACKER_APP_NAME,
      source: 'salesforce',
      deviceId: 'unknown',
      sessionId: context.sessionId,
      appVersion: VERSION,
      platform: 'other',
      env: context.environment === 'demo' ? 'demo' : 'prod',
      siteId: context.siteId,
    },
    data: events,
  };
};

const sendEvents = (events: AirTrackerEvent[], context: AirTrackerContext): AirTrackerSendResult => {
  if (events.length === 0) {
    return { success: true };
  }

  const payload = buildPayload(events, context);

  try {
    const result = getAirTrackerService(context.environment).call(payload);
    const response = result.object as AirTrackerServiceResponse | undefined;

    if (result.status === 'OK' && response && response.statusCode >= 200 && response.statusCode < 300) {
      return { success: true };
    }

    const error =
      result.errorMessage ||
      (response && (response.errorText || response.text)) ||
      `AirTracker request failed${response ? ` with status ${response.statusCode}` : ''}`;
    return { success: false, error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AirTracker service unavailable',
    };
  }
};

const airTrackerClient = {
  AIRTRACKER_APP_NAME,
  decodeAccountId,
  buildPayload,
  sendEvents,
};

module.exports = airTrackerClient;
export default airTrackerClient;
export { AIRTRACKER_APP_NAME, decodeAccountId, buildPayload, sendEvents };
