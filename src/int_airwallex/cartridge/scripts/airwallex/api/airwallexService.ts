/**
 * Airwallex HTTP Service using SFCC Service Framework
 */

import LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
import HTTPService = require('dw/svc/HTTPService');
import HTTPClient = require('dw/net/HTTPClient');
import Service = require('dw/svc/Service');
import { ENVIRONMENTS, Environment } from '../../constants/apiEndpoints';
import type { ServiceRequest, ServiceResponse } from './types';

const SERVICE_ID = 'AirwallexPublicAPI';

/**
 * Get the base URL for the current environment
 */
const getBaseUrl = (environment: Environment): string => {
  return ENVIRONMENTS[environment]?.apiUrl || ENVIRONMENTS.demo.apiUrl;
};

/**
 * Create the Airwallex HTTP service
 */
const createAirwallexService = (environment: Environment) => {
  const baseUrl = getBaseUrl(environment);

  return LocalServiceRegistry.createService(SERVICE_ID, {
    createRequest: (svc: HTTPService, request: ServiceRequest): string => {
      const url = baseUrl + request.endpoint;
      svc.setURL(url);
      svc.setRequestMethod(request.method);

      // Set default headers
      svc.addHeader('Content-Type', 'application/json');

      // Add custom headers
      if (request.headers) {
        Object.entries(request.headers).forEach(([key, value]) => {
          svc.addHeader(key, value);
        });
      }

      return request.body || '';
    },

    parseResponse: (svc: HTTPService, client: HTTPClient): ServiceResponse => {
      return {
        statusCode: client.statusCode,
        text: client.text,
        errorText: client.errorText,
      };
    },

    filterLogMessage: (msg: string): string => {
      // Filter sensitive data from logs
      return msg
        .replace(/"token"\s*:\s*"[^"]+"/g, '"token": "[FILTERED]"')
        .replace(/"x-api-key"\s*:\s*"[^"]+"/g, '"x-api-key": "[FILTERED]"')
        .replace(/"client_secret"\s*:\s*"[^"]+"/g, '"client_secret": "[FILTERED]"')
        .replace(/"api_key"\s*:\s*"[^"]+"/g, '"api_key": "[FILTERED]"');
    },

    getRequestLogMessage: (request: ServiceRequest): string => {
      return `${request.method} ${request.endpoint}`;
    },

    getResponseLogMessage: (response: ServiceResponse): string => {
      return `Status: ${response.statusCode}`;
    },
  });
};

// Service instance cache
let serviceInstance: Service | null = null;
let currentEnvironment: Environment | null = null;

/**
 * Get or create the Airwallex HTTP service
 */
const getAirwallexService = (environment: Environment): Service => {
  // Return cached instance if environment hasn't changed
  if (serviceInstance && currentEnvironment === environment) {
    return serviceInstance;
  }

  // Create new instance
  serviceInstance = createAirwallexService(environment);
  currentEnvironment = environment;

  return serviceInstance;
};

/**
 * Clear the service cache (useful for testing)
 */
const clearServiceCache = (): void => {
  serviceInstance = null;
  currentEnvironment = null;
};

const airwallexService = {
  getAirwallexService,
  createAirwallexService,
  clearServiceCache,
  getBaseUrl,
  SERVICE_ID,
};

module.exports = airwallexService;
export default airwallexService;
export { getAirwallexService, createAirwallexService, clearServiceCache, getBaseUrl, SERVICE_ID };
