export {};

const processInclude = require('base/util');
const baseDetail = require('base/product/detail');
const { initProductExpressCheckout } = require('./airwallex/express/product');

$(document).ready(() => {
  processInclude(baseDetail);
  processInclude({ initProductExpressCheckout });
});
