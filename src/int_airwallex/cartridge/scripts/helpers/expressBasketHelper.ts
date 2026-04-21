import BasketMgr = require('dw/order/BasketMgr');
import Transaction = require('dw/system/Transaction');

import logger from '@/cartridge/scripts/helpers/logger';

import type Basket from 'dw/order/Basket';

const getTemporaryBasketId = (): string | null => {
  return session.privacy.temporaryBasketId || null;
};

const setTemporaryBasketId = (id: string | null): void => {
  session.privacy.temporaryBasketId = id;
};

const getExpressBasket = (isExpressProduct: boolean): Basket | null => {
  if (isExpressProduct) {
    const tempBasketId = getTemporaryBasketId();
    if (!tempBasketId) {
      logger.error('No temporary basket ID in session for product express checkout');
      return null;
    }
    return BasketMgr.getTemporaryBasket(tempBasketId);
  }
  return BasketMgr.getCurrentBasket();
};

const cleanupTemporaryBaskets = (): void => {
  Transaction.wrap(() => {
    setTemporaryBasketId(null);
    BasketMgr.getTemporaryBaskets()
      .toArray()
      .forEach(basket => {
        BasketMgr.deleteTemporaryBasket(basket);
      });
  });
};

const expressBasketHelper = {
  getExpressBasket,
  getTemporaryBasketId,
  setTemporaryBasketId,
  cleanupTemporaryBaskets,
};

module.exports = expressBasketHelper;
export default expressBasketHelper;
export { getExpressBasket, getTemporaryBasketId, setTemporaryBasketId, cleanupTemporaryBaskets };
