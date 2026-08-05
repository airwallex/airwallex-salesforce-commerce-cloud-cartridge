import CSRFProtection = require('dw/web/CSRFProtection');
import { flushBufferedLogs, startBufferedLogging } from '@/cartridge/scripts/helpers/airTracker';

export interface PublicControllerAction {
  (): void;
  public: boolean;
}

export interface CsrfTokenData {
  csrfToken: string;
  csrfTokenName: string;
}

export function sendJson(payload: object): void {
  response.setContentType('application/json');
  response.writer.print(JSON.stringify(payload));
}

export function isAuthenticated(): boolean {
  if (session.userAuthenticated) {
    return true;
  }

  response.setStatus(403);
  return false;
}

export function isGet(): boolean {
  if (!isAuthenticated()) {
    return false;
  }

  if (request.httpMethod !== 'GET') {
    response.setStatus(405);
    return false;
  }

  if (!request.isHttpSecure()) {
    response.setStatus(403);
    return false;
  }

  return true;
}

export function isSecurePost(): boolean {
  if (!isAuthenticated()) {
    return false;
  }

  if (request.httpMethod !== 'POST') {
    response.setStatus(405);
    return false;
  }

  if (!request.isHttpSecure() || !CSRFProtection.validateRequest()) {
    response.setStatus(403);
    return false;
  }

  return true;
}

export function makePublic(handler: () => void): PublicControllerAction {
  const publicControllerAction = (() => {
    startBufferedLogging();
    try {
      handler();
    } finally {
      flushBufferedLogs();
    }
  }) as PublicControllerAction;
  publicControllerAction.public = true;
  return publicControllerAction;
}

export function getCsrfTokenData(): CsrfTokenData {
  return {
    csrfToken: CSRFProtection.generateToken(),
    csrfTokenName: CSRFProtection.getTokenName(),
  };
}

const bmControllerHelper = {
  sendJson,
  isAuthenticated,
  isGet,
  isSecurePost,
  makePublic,
  getCsrfTokenData,
};

module.exports = bmControllerHelper;

export default bmControllerHelper;
