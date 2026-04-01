/**
 * Type extensions for Express with SFCC server module methods
 */

import HttpParameterMap from 'dw/web/HttpParameterMap';
import 'express';

declare module 'express' {
  interface Request {
    httpHeaders: Record<string, any>;
    locale: {
      id: string;
    };
    httpParameterMap: HttpParameterMap;
    currentCustomer: any;
    session: {
      privacyCache: {
        get(key: string): any;
        set(key: string, value: any): void;
      };
    };
  }

  interface Response {
    setStatusCode(code: number): this;

    setStatus(code: number): this;
  }
}
