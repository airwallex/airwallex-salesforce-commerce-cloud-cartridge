import type { Environment } from '../../constants/apiEndpoints';

export type AirTrackerSeverity = 'info' | 'error';

export interface AirTrackerEvent {
  severity: AirTrackerSeverity;
  eventName: string;
  message?: string;
}

export interface AirTrackerCommonData {
  accountId: string;
  appName: string;
  source: 'salesforce';
  deviceId: 'unknown';
  sessionId: string;
  appVersion: string;
  platform: 'other';
  env: 'demo' | 'prod';
  siteId: string;
}

export interface AirTrackerPayload {
  commonData: AirTrackerCommonData;
  data: AirTrackerEvent[];
}

export interface AirTrackerContext {
  environment: Environment;
  accountId: string;
  siteId: string;
  sessionId: string;
}

export interface AirTrackerServiceResponse {
  statusCode: number;
  text: string;
  errorText: string;
}

export interface AirTrackerSendResult {
  success: boolean;
  error?: string;
}
