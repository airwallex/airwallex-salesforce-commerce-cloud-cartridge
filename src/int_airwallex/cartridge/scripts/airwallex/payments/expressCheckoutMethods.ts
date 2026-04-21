import BasketMgr = require('dw/order/BasketMgr');
import ProductMgr = require('dw/catalog/ProductMgr');
import Site = require('dw/system/Site');
import Locale = require('dw/util/Locale');

import { getCountryOptions } from '../util/countryOptions';

import type { Request, Response, NextFunction } from 'express';

interface QueryString {
  querystring: {
    pid?: string;
    quantity?: string;
  };
}

interface Amount {
  currency: string;
  value: number;
}

const getAmountFromProduct = (pid: string, quantity: number): Amount | null => {
  const product = ProductMgr.getProduct(pid);
  if (!product) return null;

  const priceModel = product.priceModel;
  const price = priceModel.price;
  if (!price.available) return null;

  return {
    currency: price.currencyCode,
    value: price.value * quantity,
  };
};

const getAmountFromBasket = (): Amount | null => {
  const basket = BasketMgr.getCurrentBasket();
  if (!basket) return null;

  const amountMoney = basket.getTotalGrossPrice();
  return {
    currency: amountMoney.getCurrencyCode(),
    value: amountMoney.getValue(),
  };
};

const expressCheckoutMethods = (req: Request & QueryString, res: Response, next: NextFunction) => {
  try {
    const currentSite = Site.getCurrent();
    const countryCode = Locale.getLocale(req.locale.id).country;
    const storeName = currentSite.getName();

    const pid = req.querystring.pid;
    const quantity = parseInt(req.querystring.quantity || '1', 10) || 1;

    const amount = pid ? getAmountFromProduct(pid, quantity) : getAmountFromBasket();

    res.json({
      amount,
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
