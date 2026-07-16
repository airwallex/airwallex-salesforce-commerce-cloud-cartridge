/**
 * AirTracker HTTP service using the SFCC Service Framework.
 */

import LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
import HTTPService = require('dw/svc/HTTPService');
import HTTPClient = require('dw/net/HTTPClient');
import Service = require('dw/svc/Service');
import type { Environment } from '../../constants/apiEndpoints';
import type { AirTrackerPayload, AirTrackerServiceResponse } from './types';

const SERVICE_ID = 'AirwallexAirTracker';
const LOGS_PATH = '/airtracker/logs';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BASE_URLS: Record<Environment, string> = {
  demo: 'https://o11y-demo.airwallex.com',
  production: 'https://o11y.airwallex.com',
};

const getBaseUrl = (environment: Environment): string => BASE_URLS[environment] || BASE_URLS.demo;

const createAirTrackerService = (environment: Environment): Service => {
  const baseUrl = getBaseUrl(environment);

  return LocalServiceRegistry.createService(SERVICE_ID, {
    createRequest: (service: HTTPService, payload: AirTrackerPayload): string => {
      service.setURL(`${baseUrl}${LOGS_PATH}`);
      service.setRequestMethod('POST');
      service.addHeader('Content-Type', 'application/json');
      service.addHeader('User-Agent', USER_AGENT);
      return JSON.stringify(payload);
    },

    parseResponse: (_service: HTTPService, client: HTTPClient): AirTrackerServiceResponse => ({
      statusCode: client.statusCode,
      text: client.text,
      errorText: client.errorText,
    }),

    filterLogMessage: (): string => '[AirTracker payload omitted]',
    getRequestLogMessage: (): string => `POST ${LOGS_PATH}`,
    getResponseLogMessage: (response: AirTrackerServiceResponse): string => `Status: ${response.statusCode}`,
  });
};

let serviceInstance: Service | null = null;
let currentEnvironment: Environment | null = null;

const getAirTrackerService = (environment: Environment): Service => {
  if (serviceInstance && currentEnvironment === environment) {
    return serviceInstance;
  }

  serviceInstance = createAirTrackerService(environment);
  currentEnvironment = environment;
  return serviceInstance;
};

const clearServiceCache = (): void => {
  serviceInstance = null;
  currentEnvironment = null;
};

const airTrackerService = {
  SERVICE_ID,
  getBaseUrl,
  createAirTrackerService,
  getAirTrackerService,
  clearServiceCache,
};

module.exports = airTrackerService;
export default airTrackerService;
export { SERVICE_ID, getBaseUrl, createAirTrackerService, getAirTrackerService, clearServiceCache };
