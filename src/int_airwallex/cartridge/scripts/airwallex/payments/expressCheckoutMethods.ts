import BasketMgr = require('dw/order/BasketMgr');
import Site = require('dw/system/Site');
import Locale = require('dw/util/Locale');

import { getCountryOptions } from '../util/countryOptions';

import type { Request, Response, NextFunction } from 'express';

const expressCheckoutMethods = (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentBasket = BasketMgr.getCurrentBasket();
    const currentSite = Site.getCurrent();

    const amountMoney = currentBasket.getTotalGrossPrice();
    const countryCode = Locale.getLocale(req.locale.id).country;
    const storeName = currentSite.getName();

    res.json({
      amount: {
        currency: amountMoney.getCurrencyCode(),
        value: amountMoney.getValue(),
      },
      countryCode,
      shippingAddressCountryOptions: getCountryOptions(),
      storeName,
    });
    return next();
  } catch {
    return next();
  }
};

export default expressCheckoutMethods;
