export {};

const processInclude = require('base/util');
const baseCheckout = require('base/checkout/checkout');
const airwallexCheckout = require('./airwallex/checkout');

$(document).ready(() => {
  processInclude(baseCheckout);
  processInclude(airwallexCheckout);
});
