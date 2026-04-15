/**
 * Airwallex Controller
 * Handles client-side API endpoints for payment integration
 */
import server from 'server';
import middlewares from './middlewares/index';
import csrf from '@/cartridge/scripts/middleware/csrf';

const { airwallex } = middlewares;

/**
 * Show confirmation
 * GET /Airwallex-ShowConfirmation
 */
server.get('ShowConfirmation', server.middleware.https, airwallex.showConfirmation);

/**
 * Get express checkout methods
 * GET /Airwallex-ExpressCheckoutMethods
 */
server.get('ExpressCheckoutMethods', server.middleware.https, airwallex.expressCheckoutMethods);

/**
 * Get shipping options
 * POST /Airwallex-ShippingOptions
 */
server.post('ShippingOptions', server.middleware.https, csrf.validateRequest, airwallex.shippingOptions);

/**
 * Select shipping method
 * POST /Airwallex-SelectShippingMethod
 */
server.post('SelectShippingMethod', server.middleware.https, csrf.validateRequest, airwallex.selectShippingMethod);

/**
 * Express checkout authorization
 * POST /Airwallex-ExpressCheckoutAuthorization
 */
server.post(
  'ExpressCheckoutAuthorization',
  server.middleware.https,
  csrf.validateRequest,
  airwallex.expressCheckoutAuthorization,
);

/**
 * Apple Pay session validation
 * POST /Airwallex-ApplePaySession
 */
server.post('ApplePaySession', server.middleware.https, csrf.validateRequest, airwallex.applePaySession);

/**
 * Handle return from payment
 * GET /Airwallex-ReturnFromPayment
 */
server.get('ReturnFromPayment', server.middleware.https, airwallex.returnFromPayment);

module.exports = server.exports();
