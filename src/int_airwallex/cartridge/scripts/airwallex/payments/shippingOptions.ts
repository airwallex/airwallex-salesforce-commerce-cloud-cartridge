import ShippingMgr = require('dw/order/ShippingMgr');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

import { getCountryOptions } from '../util/countryOptions';
import { getExpressBasket } from '@/cartridge/scripts/helpers/expressBasketHelper';
import ShippingMethodModel from '*/cartridge/models/shipping/shippingMethod';

import type Basket from 'dw/order/Basket';
import type Shipment from 'dw/order/Shipment';
import type ShippingMethod from 'dw/order/ShippingMethod';
import type { ShippingMethodModelInstance } from '*/cartridge/models/shipping/shippingMethod';

import type { Request, Response, NextFunction } from 'express';

interface AddressParams {
  city: string;
  countryCode: string;
  stateCode: string;
  postalCode: string;
}

export interface AvailableShippingOption extends ShippingMethodModelInstance {
  shippingCostAmount: {
    amount: number;
    currency: string;
  } | null;
  shipmentUUID: string;
}

const updateShippingAddress = (basket: Basket, address?: AddressParams) => {
  if (!address) {
    return;
  }

  let shippingAddress = basket.getDefaultShipment().shippingAddress;
  Transaction.wrap(() => {
    if (!shippingAddress) {
      shippingAddress = basket.getDefaultShipment().createShippingAddress();
    }
    shippingAddress.setCity(address.city);
    shippingAddress.setPostalCode(address.postalCode);
    shippingAddress.setStateCode(address.stateCode);
    shippingAddress.setCountryCode(address.countryCode);
  });
};

const getShippingCost = (method: ShippingMethod, shipment: Shipment) => {
  const shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);
  if (!shipmentShippingModel) {
    return null;
  }
  try {
    const cost = shipmentShippingModel.getShippingCost(method);
    return cost
      ? {
        amount: cost.getAmount().value,
        currency: cost.getAmount().currencyCode,
      }
      : null;
  } catch {
    return null;
  }
};

const getShippingOptions = (shipment: Shipment, address?: AddressParams) => {
  const shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);

  return shipmentShippingModel.getApplicableShippingMethods(address);
};

const getAvailableShippingOptions = (shipment: Shipment, address?: AddressParams) => {
  const shipmentMethods = getShippingOptions(shipment, address);

  const result: AvailableShippingOption[] = [];
  Array.from(shipmentMethods).forEach(method => {
    if (method.custom.storePickupEnabled) {
      return;
    }
    const shippingMethodModel = new ShippingMethodModel(method, shipment);
    const shippingCost = getShippingCost(method, shipment);
    const shipmentUUID = shipment.getUUID();
    result.push({
      ...shippingMethodModel,
      shippingCostAmount: shippingCost,
      shipmentUUID,
    });
  });

  return result;
};

interface FormData {
  form: AddressParams & {
    isExpressProduct?: string;
  };
}

const shippingOptions = (req: Request & FormData, res: Response, next: NextFunction) => {
  try {
    const { isExpressProduct: isExpressProductStr, ...addressParams } = req.form;
    const isExpressProduct = isExpressProductStr === 'true';
    const basket = getExpressBasket(isExpressProduct);

    if (!basket) {
      res.json({
        error: true,
        redirectUrl: URLUtils.https('Cart-Show').toString(),
      });
      return next();
    }

    const countryCode = addressParams?.countryCode;
    if (countryCode) {
      const countryOptionsList = getCountryOptions();
      const isValidCountry = countryOptionsList.some(opt => opt.value === countryCode);
      if (!isValidCountry) {
        res.json({ shippingMethods: [] });
        return next();
      }
    }

    updateShippingAddress(basket, addressParams);
    const shipments = Array.from(basket.getShipments());

    let result: AvailableShippingOption[] = [];
    shipments.forEach(shipment => {
      if (result.length > 0) {
        return;
      }

      const availableShippingOptions = getAvailableShippingOptions(shipment, addressParams);

      if (availableShippingOptions.length > 0) {
        result = availableShippingOptions;
      }
    });

    if (result.length === 0) {
      throw new Error('No shipping options found');
    }

    res.json({
      shippingMethods: result,
    });

    return next();
  } catch {
    return next();
  }
};

export default shippingOptions;
