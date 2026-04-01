import URLRedirectMgr = require('dw/web/URLRedirectMgr');
import server from 'server';
import type { NextFunction, Request, Response } from 'express';
import { APPLE_PAY_DOMAIN_VERIFICATION_URL } from '../scripts/constants/appConfig';

declare const module: NodeJS.Module & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superModule: any;
};

if (module.superModule) {
  server.extend(module.superModule);
}

server.prepend('Start', (req: Request, res: Response, next: NextFunction) => {
  const origin = URLRedirectMgr.redirectOrigin;

  if (origin === APPLE_PAY_DOMAIN_VERIFICATION_URL) {
    const verificationModule = require('../scripts/constants/applePayDomainVerification');
    const content = verificationModule?.default ?? verificationModule;

    response.setContentType('text/plain');
    response.getWriter().print(content);
    return null;
  }

  return next();
});

module.exports = server.exports();
