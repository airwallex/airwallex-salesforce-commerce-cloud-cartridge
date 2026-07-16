/**
 * Logger wrapper for consistent Airwallex logging
 */

import Logger = require('dw/system/Logger');
import Log = require('dw/system/Log');
import type { AirTrackerSeverity } from '../airwallex/airtracker/types';

const LOG_CATEGORY = 'Airwallex';
type LocalLogLevel = 'debug' | 'info' | 'warn' | 'error';
const AIRTRACKER_EVENT_NAMES: Record<LocalLogLevel, string> = {
  debug: 'sfcc_debug',
  info: 'sfcc_info',
  warn: 'sfcc_warning',
  error: 'sfcc_error',
};
const AIRTRACKER_SEVERITIES: Record<LocalLogLevel, AirTrackerSeverity> = {
  debug: 'info',
  info: 'info',
  warn: 'info',
  error: 'error',
};

/**
 * Get the SFCC logger instance
 */
const getLogger = (): Log => {
  return Logger.getLogger(LOG_CATEGORY);
};

/**
 * Format a log message with optional context
 */
const formatMessage = (message: string, context?: Record<string, unknown>): string => {
  if (context) {
    try {
      return `${message} | ${JSON.stringify(context)}`;
    } catch {
      return `${message} | [Context serialization failed]`;
    }
  }
  return message;
};

/**
 * Mirror a local log to AirTracker without affecting the application flow.
 */
const mirrorLog = (level: LocalLogLevel, message: string, context?: Record<string, unknown>): void => {
  try {
    // Lazy loading prevents a circular dependency because authentication also logs locally.
    const airTracker = require('./airTracker') as {
      trackLog: (
        severity: AirTrackerSeverity,
        eventName: string,
        logMessage: string,
        logContext?: Record<string, unknown>,
      ) => boolean;
    };
    if (context) {
      airTracker.trackLog(AIRTRACKER_SEVERITIES[level], AIRTRACKER_EVENT_NAMES[level], message, context);
      return;
    }
    airTracker.trackLog(AIRTRACKER_SEVERITIES[level], AIRTRACKER_EVENT_NAMES[level], message);
  } catch {
    // Remote diagnostics must never interfere with local logging or checkout.
  }
};

/**
 * Log a debug message
 */
const debug = (message: string, context?: Record<string, unknown>): void => {
  const formattedMessage = formatMessage(message, context);
  getLogger().debug(formattedMessage);
  mirrorLog('debug', message, context);
};

/**
 * Log an info message
 */
const info = (message: string, context?: Record<string, unknown>): void => {
  const formattedMessage = formatMessage(message, context);
  getLogger().info(formattedMessage);
  mirrorLog('info', message, context);
};

/**
 * Log a warning message
 */
const warn = (message: string, context?: Record<string, unknown>): void => {
  const formattedMessage = formatMessage(message, context);
  getLogger().warn(formattedMessage);
  mirrorLog('warn', message, context);
};

/**
 * Log an error message.
 */
const error = (message: string, errorOrContext?: Error | Record<string, unknown>): void => {
  let formattedMessage: string;
  if (errorOrContext instanceof Error) {
    formattedMessage = `${message} | Error: ${errorOrContext.message} | Stack: ${errorOrContext.stack || 'N/A'}`;
  } else {
    formattedMessage = formatMessage(message, errorOrContext);
  }
  getLogger().error(formattedMessage);
  if (errorOrContext instanceof Error) {
    mirrorLog('error', formattedMessage);
  } else {
    mirrorLog('error', message, errorOrContext);
  }
};

/**
 * Log an API request
 */
const logApiRequest = (method: string, endpoint: string, context?: Record<string, unknown>): void => {
  info(`API Request: ${method} ${endpoint}`, context);
};

/**
 * Log an API response
 */
const logApiResponse = (
  method: string,
  endpoint: string,
  statusCode: number,
  context?: Record<string, unknown>,
): void => {
  const level = statusCode >= 400 ? 'error' : 'info';
  const logFn = level === 'error' ? error : info;
  logFn(`API Response: ${method} ${endpoint} - ${statusCode}`, context);
};

/**
 * Log a webhook event
 */
const logWebhook = (eventName: string, eventId: string, context?: Record<string, unknown>): void => {
  info(`Webhook: ${eventName}`, { eventId, ...context });
};

const logger = {
  debug,
  info,
  warn,
  error,
  logApiRequest,
  logApiResponse,
  logWebhook,
  LOG_CATEGORY,
};

module.exports = logger;
export default logger;
export { debug, info, warn, error, logApiRequest, logApiResponse, logWebhook, LOG_CATEGORY };
