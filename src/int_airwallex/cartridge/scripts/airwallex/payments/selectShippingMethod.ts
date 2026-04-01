import BasketMgr = require('dw/order/BasketMgr');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

import shippingHelpers from '*/cartridge/scripts/checkout/shippingHelpers';
import basketCalculationHelpers from '*/cartridge/scripts/helpers/basketCalculationHelpers';
import CartModel from '*/cartridge/models/cart';

import type { Request, Response, NextFunction } from 'express';

interface FormData {
  form: {
    shipmentUUID: string;
    shippingMethodID: string;
  };
}

const selectShippingMethod = (req: Request & FormData, res: Response, next: NextFunction) => {
  try {
    const { shipmentUUID, shippingMethodID } = req.form;
    const basket = BasketMgr.getCurrentBasket();

    if (!basket) {
      res.json({
        error: true,
        redirectUrl: URLUtils.https('Cart-Show').toString(),
      });
      return next();
    }

    const shipment = shipmentUUID ? shippingHelpers.getShipmentByUUID(basket, shipmentUUID) : basket.defaultShipment;

    if (!shipment) {
      res.json({
        error: true,
        redirectUrl: URLUtils.https('Cart-Show').toString(),
      });
      return next();
    }

    Transaction.wrap(() => {
      shippingHelpers.selectShippingMethod(shipment, shippingMethodID);
      if (basket && !shipment.shippingMethod) {
        throw new Error(`Failed to select shipping method ${shippingMethodID} for shipment ${shipmentUUID}`);
      }
      basketCalculationHelpers.calculateTotals(basket);
    });

    const cart = new CartModel(basket);
    const grandTotal = {
      value: basket.getTotalGrossPrice().value,
      currency: basket.getTotalGrossPrice().currencyCode,
    };

    res.json({
      ...cart,
      grandTotal,
    });

    return next();
  } catch {
    return next();
  }
};

export default selectShippingMethod;
