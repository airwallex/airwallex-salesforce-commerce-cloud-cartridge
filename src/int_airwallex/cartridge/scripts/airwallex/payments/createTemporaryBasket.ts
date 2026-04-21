import BasketMgr = require('dw/order/BasketMgr');
import Transaction = require('dw/system/Transaction');

import logger from '@/cartridge/scripts/helpers/logger';
import { cleanupTemporaryBaskets, setTemporaryBasketId } from '@/cartridge/scripts/helpers/expressBasketHelper';
import cartHelper from '*/cartridge/scripts/cart/cartHelpers';
import basketCalculationHelpers from '*/cartridge/scripts/helpers/basketCalculationHelpers';

import type { Request, Response, NextFunction } from 'express';

interface FormData {
  form: {
    pid: string;
    quantity: string;
    options?: string;
    childProducts?: string;
  };
}

const createTemporaryBasket = (req: Request & FormData, res: Response, next: NextFunction) => {
  try {
    cleanupTemporaryBaskets();

    const tempBasket = BasketMgr.createTemporaryBasket();
    if (!tempBasket) {
      logger.error('Failed to create temporary basket');
      res.setStatusCode(500);
      res.json({ error: true, errorMessage: 'Failed to create temporary basket' });
      return next();
    }

    setTemporaryBasketId(tempBasket.UUID);

    const { pid, quantity: quantityStr, options: optionsStr, childProducts: childProductsStr } = req.form;
    const quantity = parseInt(quantityStr, 10) || 1;
    const options = optionsStr ? JSON.parse(optionsStr) : [];
    const childProducts = childProductsStr ? JSON.parse(childProductsStr) : [];

    let result: { error: boolean; message?: string };
    Transaction.wrap(() => {
      result = cartHelper.addProductToCart(tempBasket, pid, quantity, childProducts, options);
      if (!result.error) {
        cartHelper.ensureAllShipmentsHaveMethods(tempBasket);
        basketCalculationHelpers.calculateTotals(tempBasket);
      }
    });

    if (result!.error) {
      logger.error('Failed to add product to temporary basket', { pid, message: result!.message });
      cleanupTemporaryBaskets();
      res.setStatusCode(500);
      res.json({ error: true, errorMessage: result!.message || 'Failed to add product' });
      return next();
    }

    const amount = {
      value: tempBasket.getTotalGrossPrice().value,
      currency: tempBasket.getTotalGrossPrice().currencyCode,
    };

    res.json({
      temporaryBasketCreated: true,
      amount,
    });

    return next();
  } catch (error) {
    logger.error('Error creating temporary basket', { error });
    cleanupTemporaryBaskets();
    res.setStatusCode(500);
    res.json({ error: true, errorMessage: 'Unexpected error creating temporary basket' });
    return next();
  }
};

export default createTemporaryBasket;
