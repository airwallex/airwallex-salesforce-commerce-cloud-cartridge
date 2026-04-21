import { createSurface } from './shared/surface';

export { isExpressCheckoutEnabled } from './shared/config';
export type { ExpressCheckoutContainerIds, ExpressCheckoutSurface, RenderOptions } from './shared/surface';

const CHECKOUT_CONTAINER_IDS = {
  googlePay: 'awx-google-pay',
  applePay: 'awx-apple-pay',
};

export const CART_CONTAINER_IDS = {
  googlePay: 'awx-google-pay-cart',
  applePay: 'awx-apple-pay-cart',
};

export const PRODUCT_CONTAINER_IDS = {
  googlePay: 'awx-google-pay-product',
  applePay: 'awx-apple-pay-product',
};

export const checkoutSurface = createSurface(CHECKOUT_CONTAINER_IDS);
export const cartSurface = createSurface(CART_CONTAINER_IDS, 1);
export const productSurface = createSurface(PRODUCT_CONTAINER_IDS, 2);
