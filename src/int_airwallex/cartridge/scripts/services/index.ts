/**
 * Barrel export for services
 */

// export * from './payment';
export * from './checkoutService';

// import paymentService from './payment';
import checkoutService from './checkoutService';

const services = {
  // paymentService,
  checkoutService,
};

module.exports = services;
export default services;
