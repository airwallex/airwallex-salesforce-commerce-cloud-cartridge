/**
 * Apple Pay API client
 */

import baseClient from './baseClient';
import { authenticatedRequest } from './apiHelper';
import logger from '../../helpers/logger';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import type {
  ApiResponse,
  ApplePayDomainsRegisterRequest,
  ApplePayRegisteredDomainsResponse,
  ApplePaySessionRequest,
  ApplePaySessionResponse,
} from './types';

/**
 * Register domains for Apple Pay
 */
const registerDomains = (request: ApplePayDomainsRegisterRequest): ApiResponse<ApplePayRegisteredDomainsResponse> => {
  logger.info('Registering Apple Pay domains', {
    domainCount: request.items.length,
  });

  return authenticatedRequest(headers =>
    baseClient.post<ApplePayRegisteredDomainsResponse>(API_ENDPOINTS.APPLEPAY_DOMAINS_ADD, request, headers),
  );
};

/**
 * List all registered Apple Pay domains
 */
const listDomains = (): ApiResponse<ApplePayRegisteredDomainsResponse> => {
  logger.info('Listing Apple Pay domains');

  return authenticatedRequest(headers =>
    baseClient.get<ApplePayRegisteredDomainsResponse>(API_ENDPOINTS.APPLEPAY_DOMAINS_LIST, headers),
  );
};

/**
 * Start an Apple Pay merchant validation session
 */
const startSession = (request: ApplePaySessionRequest): ApiResponse<ApplePaySessionResponse> => {
  logger.info('Starting Apple Pay session');

  return authenticatedRequest(headers =>
    baseClient.post<ApplePaySessionResponse>(API_ENDPOINTS.APPLEPAY_SESSION, request, headers),
  );
};

const applePayClient = {
  registerDomains,
  listDomains,
  startSession,
};

module.exports = applePayClient;
export default applePayClient;
export { registerDomains, listDomains, startSession };
