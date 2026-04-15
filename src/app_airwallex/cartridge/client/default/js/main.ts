export {};

require('base/main');

const processInclude = require('base/util');
const { initCartExpressCheckout } = require('./airwallex/express/cart');

$(document).ready(() => {
  processInclude({ initCartExpressCheckout });
});
