/**
 * Logger wrapper for consistent Airwallex logging
 */

import Logger = require('dw/system/Logger');
import Log = require('dw/system/Log');

const LOG_CATEGORY = 'Airwallex';

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
 * Log a debug message
 */
const debug = (message: string, context?: Record<string, unknown>): void => {
  getLogger().debug(formatMessage(message, context));
};

/**
 * Log an info message
 */
const info = (message: string, context?: Record<string, unknown>): void => {
  getLogger().info(formatMessage(message, context));
};

/**
 * Log a warning message
 */
const warn = (message: string, context?: Record<string, unknown>): void => {
  getLogger().warn(formatMessage(message, context));
};

/**
 * Log an error message
 */
const error = (message: string, errorOrContext?: Error | Record<string, unknown>): void => {
  if (errorOrContext instanceof Error) {
    getLogger().error(`${message} | Error: ${errorOrContext.message} | Stack: ${errorOrContext.stack || 'N/A'}`);
  } else {
    getLogger().error(formatMessage(message, errorOrContext));
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
