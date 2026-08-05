/**
 * Best-effort remote logging facade.
 *
 * Local SFCC logging never depends on this module succeeding.
 */

import Site = require('dw/system/Site');
import UUIDUtils = require('dw/util/UUIDUtils');
import authentication from '../airwallex/api/authentication';
import airTrackerClient from '../airwallex/airtracker/airTrackerClient';
import type { AirTrackerEvent, AirTrackerSeverity } from '../airwallex/airtracker/types';
import type { Environment } from '../constants/apiEndpoints';
import configHelper from './configHelper';

const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const AIRTRACKER_SESSION_ID_KEY = 'awxAirTrackerSessionId';
const MAX_CONTEXT_DEPTH = 10;
const MAX_LOG_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /([^@\s|"]+)@([^@\s|"]+\.[^@\s|"]+)/g;
const PHONE_PATTERN = /\+?\d{6,20}/g;
const PRIVATE_KEY_PATTERN =
  /^(?:name)$|(?:(?:x[_-]?)?api[_-]?key|token|secret|password|authorization|client[_-]?secret|first[_-]?name|last[_-]?name|full[_-]?name|customer[_-]?name|email|phone|mobile|address[12]?|city|state|province|postal[_-]?code|postcode|zip|card[_-]?number|cvc|cvv|expir(?:y|ation)(?:[_-]?(?:month|year|date))?)$/i;
const PRIVATE_VALUE_PATTERN =
  /((?:"?(?:[\w-]*(?:api[_-]?key|token|secret|password|authorization|client[_-]?secret|card[_-]?number|cvc|cvv)|first[_-]?name|last[_-]?name|full[_-]?name|customer[_-]?name|name|email|phone|mobile|address[12]?|city|state|province|postal[_-]?code|postcode|zip|expir(?:y|ation)(?:[_-]?(?:month|year|date))?)"?)\s*[:=]\s*)("[^"]*"|'[^']*'|(?:Bearer\s+)?[^\s,|}\[{]+)/gi;

const maskEmail = (_match: string, user: string, domain: string): string => {
  const maskedUser =
    user.length <= 2
      ? `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 0))}`
      : `${user.slice(0, 1)}${'*'.repeat(user.length - 2)}${user.slice(-1)}`;
  return `${maskedUser}@${domain}`;
};

const maskPhone = (phone: string): string => {
  const prefixLength = 3;
  const suffixLength = 2;
  if (phone.length <= prefixLength + suffixLength) {
    return `${phone.slice(0, 1)}${'*'.repeat(Math.max(phone.length - 1, 0))}`;
  }
  return `${phone.slice(0, prefixLength)}${'*'.repeat(
    phone.length - prefixLength - suffixLength,
  )}${phone.slice(-suffixLength)}`;
};

const sanitizeLogMessage = (message: string): string => {
  return message
    .slice(0, MAX_LOG_MESSAGE_LENGTH)
    .replace(PRIVATE_VALUE_PATTERN, `$1"${REDACTED}"`)
    .replace(EMAIL_PATTERN, maskEmail)
    .replace(PHONE_PATTERN, maskPhone);
};

const sanitizeContextValue = (value: unknown, key?: string, ancestors: unknown[] = [], depth = 0): unknown => {
  if (key && PRIVATE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }
  if (typeof value === 'string') {
    return sanitizeLogMessage(value);
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (depth >= MAX_CONTEXT_DEPTH || ancestors.indexOf(value) >= 0) {
    return CIRCULAR;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeContextValue(item, undefined, [...ancestors, value], depth + 1));
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).reduce<Record<string, unknown>>((sanitized, childKey) => {
      return {
        ...sanitized,
        [childKey]: sanitizeContextValue(
          (value as Record<string, unknown>)[childKey],
          childKey,
          [...ancestors, value],
          depth + 1,
        ),
      };
    }, {});
  }
  return undefined;
};

const formatRemoteLogMessage = (message: string, context?: Record<string, unknown>): string => {
  const sanitizedMessage = sanitizeLogMessage(message);
  if (!context) {
    return sanitizedMessage;
  }

  try {
    return `${sanitizedMessage} | ${JSON.stringify(sanitizeContextValue(context))}`.slice(0, MAX_LOG_MESSAGE_LENGTH);
  } catch {
    return `${sanitizedMessage} | [Context serialization failed]`.slice(0, MAX_LOG_MESSAGE_LENGTH);
  }
};

const getAirTrackerSessionId = (): string => {
  try {
    const existingSessionId = session.privacy[AIRTRACKER_SESSION_ID_KEY];
    if (typeof existingSessionId === 'string' && existingSessionId) {
      return existingSessionId;
    }

    const sessionId = UUIDUtils.createUUID();
    session.privacy[AIRTRACKER_SESSION_ID_KEY] = sessionId;
    return sessionId;
  } catch {
    return UUIDUtils.createUUID();
  }
};

let bufferedEventsByExecution: Record<string, AirTrackerEvent[]> = {};
let bufferedContextByExecution: Record<string, { environment: Environment; accountId: string }> = {};
let fallbackExecutionId: string | null = null;

const getRequestId = (): string | null => {
  try {
    return typeof request !== 'undefined' && request.requestID ? request.requestID : null;
  } catch {
    return null;
  }
};

const getExecutionId = (): string | null => getRequestId() || fallbackExecutionId;

const startBufferedLogging = (): boolean => {
  try {
    const requestId = getRequestId();
    const executionId = requestId || UUIDUtils.createUUID();
    const remainingContexts = { ...bufferedContextByExecution };
    delete remainingContexts[executionId];
    bufferedEventsByExecution = {
      ...bufferedEventsByExecution,
      [executionId]: [],
    };
    bufferedContextByExecution = remainingContexts;
    if (!requestId) {
      fallbackExecutionId = executionId;
    }
    return true;
  } catch {
    return false;
  }
};

const setBufferedLoggingContext = (environment: Environment, token: string): boolean => {
  try {
    const executionId = getExecutionId();
    if (!executionId || !bufferedEventsByExecution[executionId]) {
      return false;
    }

    bufferedContextByExecution = {
      ...bufferedContextByExecution,
      [executionId]: {
        environment,
        accountId: airTrackerClient.decodeAccountId(token),
      },
    };
    return true;
  } catch {
    return false;
  }
};

const trackLog = (
  severity: AirTrackerSeverity,
  eventName: string,
  message: string,
  context?: Record<string, unknown>,
): boolean => {
  if (!configHelper.isAnalyticsEnabled()) {
    return false;
  }

  try {
    const executionId = getExecutionId();
    if (!executionId || !bufferedEventsByExecution[executionId]) {
      return false;
    }

    const event: AirTrackerEvent = {
      severity,
      eventName,
      message: formatRemoteLogMessage(message, context),
    };
    bufferedEventsByExecution = {
      ...bufferedEventsByExecution,
      [executionId]: [...bufferedEventsByExecution[executionId], event],
    };
    return true;
  } catch {
    return false;
  }
};

const flushBufferedLogs = (): boolean => {
  try {
    const executionId = getExecutionId();
    if (!executionId || !bufferedEventsByExecution[executionId]) {
      return true;
    }

    const events = bufferedEventsByExecution[executionId];
    const bufferedContext = bufferedContextByExecution[executionId];
    const remainingBuffers = { ...bufferedEventsByExecution };
    const remainingContexts = { ...bufferedContextByExecution };
    delete remainingBuffers[executionId];
    delete remainingContexts[executionId];
    bufferedEventsByExecution = remainingBuffers;
    bufferedContextByExecution = remainingContexts;
    if (fallbackExecutionId === executionId) {
      fallbackExecutionId = null;
    }

    if (events.length === 0) {
      return true;
    }

    if (!configHelper.isAnalyticsEnabled()) {
      return true;
    }

    const environment = bufferedContext?.environment ?? configHelper.getEnvironment();
    if (!environment) {
      return false;
    }

    const site = Site.getCurrent();
    const accountId =
      bufferedContext?.accountId ?? airTrackerClient.decodeAccountId(authentication.getCachedAccessToken(environment));
    return airTrackerClient.sendEvents(events, {
      environment,
      accountId,
      siteId: site ? site.ID : 'unknown',
      sessionId: getAirTrackerSessionId(),
    }).success;
  } catch {
    return false;
  }
};

const airTracker = {
  sanitizeLogMessage,
  formatRemoteLogMessage,
  startBufferedLogging,
  setBufferedLoggingContext,
  trackLog,
  flushBufferedLogs,
};

module.exports = airTracker;
export default airTracker;
export {
  sanitizeLogMessage,
  formatRemoteLogMessage,
  startBufferedLogging,
  setBufferedLoggingContext,
  trackLog,
  flushBufferedLogs,
};
