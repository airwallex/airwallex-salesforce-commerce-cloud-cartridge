import middlewares from './middlewares/index';

import type { Request } from 'express';
import type { PaymentForm, ViewData } from './types';

function processForm(req: Request, paymentForm: PaymentForm, viewData: ViewData) {
  return middlewares.processForm(req, paymentForm, viewData);
}

function savePaymentInformation() {}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
