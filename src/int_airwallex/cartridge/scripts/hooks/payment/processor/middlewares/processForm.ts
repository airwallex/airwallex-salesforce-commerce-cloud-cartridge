import type { Request } from 'express';
import type { PaymentForm, ViewData, ViewDataExt } from '../types';

function getViewData(viewData: ViewData, paymentForm: PaymentForm): ViewDataExt {
  return {
    ...viewData,
    paymentMethod: {
      value: paymentForm.paymentMethod.value,
      htmlName: paymentForm.paymentMethod.value,
    },
  };
}

function processForm(req: Request, paymentForm: PaymentForm, viewData: ViewData) {
  return {
    error: false,
    viewData: getViewData(viewData, paymentForm),
  };
}

export default processForm;
module.exports = processForm;
