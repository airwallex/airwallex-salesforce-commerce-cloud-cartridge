import Customer = require('dw/customer/Customer');
import Basket = require('dw/order/Basket');
import Collection = require('dw/util/Collection');
import OrderPaymentInstrument = require('dw/order/OrderPaymentInstrument');
import URLUtils = require('dw/web/URLUtils');
import { PAYMENT_METHOD_ID } from '../scripts/constants/appConfig';

declare const module: NodeJS.Module & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superModule: any;
};

const base = module.superModule;
const collections = require('*/cartridge/scripts/util/collections');

const getSelectedPaymentInstruments = (selectedPaymentInstruments: Collection<OrderPaymentInstrument>) => {
  return collections.map(
    selectedPaymentInstruments,
    ({ paymentMethod, paymentTransaction, custom, creditCardType, maskedCreditCardNumber }: OrderPaymentInstrument) => {
      const baseResult = {
        paymentMethod,
        amount: paymentTransaction.amount.value,
        awxPaymentIntentId: custom.awxPaymentIntentId,
        awxPaymentIntentClientSecret: custom.awxPaymentIntentClientSecret,
        awxCurrency: custom.awxPaymentIntentCurrency,
        awxContinueUrl: URLUtils.https('Airwallex-ReturnFromPayment').toString(),
        awxPaymentMethodType: custom.awxPaymentMethodType,
      };
      if (paymentMethod === PAYMENT_METHOD_ID.CARD) {
        return {
          ...baseResult,
          creditCardBrand: creditCardType,
          maskedCreditCardNumber,
        };
      }
      return baseResult;
    },
  );
};

/**
 * Payment class that represents payment information for the current basket
 * Extends SFRA base Payment model to add Airwallex payment methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Payment(this: any, currentBasket: Basket, currentCustomer: Customer, countryCode: string) {
  // Call the base constructor
  base.call(this, currentBasket, currentCustomer, countryCode);

  const { paymentInstruments } = currentBasket;

  this.selectedPaymentInstruments = paymentInstruments ? getSelectedPaymentInstruments(paymentInstruments) : null;
}

module.exports = Payment;
