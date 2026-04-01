import OrderMgr = require('dw/order/OrderMgr');

import type { Request, Response, NextFunction } from 'express';

interface QueryString {
  querystring: {
    orderNo: string;
    orderToken: string;
  };
}

const showConfirmation = (req: Request & QueryString, res: Response, next: NextFunction) => {
  try {
    const { orderNo, orderToken } = req.querystring;

    if (orderNo && orderToken) {
      const order = OrderMgr.getOrder(orderNo, orderToken);

      res.render('airwallex/orderConfirmation', {
        orderNo: order.orderNo,
        orderToken: order.orderToken,
      });
    }
    return next();
  } catch {
    return next();
  }
};

export default showConfirmation;
