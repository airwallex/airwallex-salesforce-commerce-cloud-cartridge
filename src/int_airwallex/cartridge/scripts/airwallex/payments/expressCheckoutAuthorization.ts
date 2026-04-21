import PaymentMgr = require('dw/order/PaymentMgr');
import HookMgr = require('dw/system/HookMgr');
import Transaction = require('dw/system/Transaction');
import URLUtils = require('dw/web/URLUtils');

import { PAYMENT_METHOD_ID } from '@/cartridge/scripts/constants/appConfig';
import { getExpressBasket } from '@/cartridge/scripts/helpers/expressBasketHelper';

import type { Request, Response, NextFunction } from 'express';
import type Basket from 'dw/order/Basket';
import type { HandleResult } from '@/cartridge/scripts/hooks/payment/processor/types';

export interface ExpressCheckoutAddress {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  countryCode: string;
  postalCode: string;
  address1: string;
  address2?: string;
  stateCode?: string;
}

interface FormData {
  form: {
    shippingAddress: string;
    billingAddress: string;
    email: string;
    isExpressProduct?: string;
  };
}

const setBillingAndShippingAddresses = (
  basket: Basket,
  billingAddressInput: ExpressCheckoutAddress,
  shippingAddressInput: ExpressCheckoutAddress,
  email: string,
) => {
  let billingAddress = basket.billingAddress;
  let shippingAddress = basket.getDefaultShipment().shippingAddress;

  Transaction.wrap(() => {
    if (!shippingAddress) {
      shippingAddress = basket.getDefaultShipment().createShippingAddress();
    }
    if (!billingAddress) {
      billingAddress = basket.createBillingAddress();
    }
  });

  Transaction.wrap(() => {
    billingAddress.setFirstName(billingAddressInput.firstName);
    billingAddress.setLastName(billingAddressInput.lastName);
    billingAddress.setPhone(billingAddressInput.phone);
    billingAddress.setCity(billingAddressInput.city);
    billingAddress.setCountryCode(billingAddressInput.countryCode);
    billingAddress.setPostalCode(billingAddressInput.postalCode);
    billingAddress.setAddress1(billingAddressInput.address1);
    if (billingAddressInput.address2) {
      billingAddress.setAddress2(billingAddressInput.address2);
    }
    if (billingAddressInput.stateCode) {
      billingAddress.setStateCode(billingAddressInput.stateCode);
    }

    basket.setCustomerEmail(email);

    shippingAddress.setFirstName(shippingAddressInput.firstName);
    shippingAddress.setLastName(shippingAddressInput.lastName);
    shippingAddress.setPhone(shippingAddressInput.phone);
    shippingAddress.setCity(shippingAddressInput.city);
    shippingAddress.setCountryCode(shippingAddressInput.countryCode);
    shippingAddress.setPostalCode(shippingAddressInput.postalCode);
    shippingAddress.setAddress1(shippingAddressInput.address1);
    if (shippingAddressInput.address2) {
      shippingAddress.setAddress2(shippingAddressInput.address2);
    }
    if (shippingAddressInput.stateCode) {
      shippingAddress.setStateCode(shippingAddressInput.stateCode);
    }
  });
};

const expressCheckoutAuthorization = (req: Request & FormData, res: Response, next: NextFunction) => {
  try {
    const {
      shippingAddress: shippingAddressString,
      billingAddress: billingAddressString,
      email,
      isExpressProduct: isExpressProductStr,
    } = req.form;
    const shippingAddress = JSON.parse(shippingAddressString) as ExpressCheckoutAddress;
    const billingAddress = JSON.parse(billingAddressString) as ExpressCheckoutAddress;
    const isExpressProduct = isExpressProductStr === 'true';
    const basket = getExpressBasket(isExpressProduct);

    if (!basket) {
      res.json({
        error: true,
        redirectUrl: URLUtils.https('Cart-Show').toString(),
      });
      return next();
    }

    setBillingAndShippingAddresses(basket, billingAddress, shippingAddress, email);

    if (basket.totalGrossPrice.value <= 0) {
      res.json({
        error: true,
        redirectUrl: URLUtils.https('Cart-Show').toString(),
      });
      return next();
    }

    Transaction.wrap(() => {
      Array.from(basket.getPaymentInstruments()).forEach(paymentInstrument => {
        basket.removePaymentInstrument(paymentInstrument);
      });
    });

    const paymentMethodID = PAYMENT_METHOD_ID.APM;
    const paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

    let result: HandleResult;
    if (HookMgr.hasHook('app.payment.processor.' + paymentProcessor.ID.toLowerCase())) {
      result = HookMgr.callHook(
        'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
        'Handle',
        basket,
        {},
        paymentMethodID,
        req,
      );
    } else {
      result = HookMgr.callHook('app.payment.processor.default', 'Handle');
    }

    if (result.error) {
      res.json({
        error: true,
        redirectUrl: result.redirectUrl,
      });
      return next();
    }

    res.json({
      paymentIntentId: result.paymentIntent?.id,
      clientSecret: result.paymentIntent?.clientSecret,
      redirectUrl: result.redirectUrl,
    });

    return next();
  } catch {
    return next();
  }
};

export default expressCheckoutAuthorization;
