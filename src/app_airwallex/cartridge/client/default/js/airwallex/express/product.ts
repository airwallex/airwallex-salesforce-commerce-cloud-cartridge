import { initAirwallexSDK } from '../utils/sdk';
import { waitForDependencies } from './shared/dependencies';
import { PRODUCT_CONTAINER_IDS, productSurface, isExpressCheckoutEnabled } from './index';
import type { ProductData } from './paymentMethods/base';

const getProductData = (): ProductData | null => {
  const container = document.getElementById('awx-express-checkout-product');
  const pid = container?.getAttribute('data-product-id');
  if (!pid) return null;

  const quantitySelect = document.querySelector('.quantity-select') as HTMLSelectElement | null;
  const quantity = quantitySelect ? parseInt(quantitySelect.value, 10) || 1 : 1;

  return { pid, quantity };
};

const initAndRender = async(): Promise<void> => {
  if (productSurface.isRendered()) return;
  if (!window.airwallexConfig) return;
  if (!isExpressCheckoutEnabled()) return;

  const googlePayContainer = document.getElementById(PRODUCT_CONTAINER_IDS.googlePay);
  const applePayContainer = document.getElementById(PRODUCT_CONTAINER_IDS.applePay);
  if (!googlePayContainer && !applePayContainer) return;

  const productData = getProductData();
  if (!productData) return;

  try {
    await waitForDependencies();
    if (!window.httpClient) return;
    await initAirwallexSDK();
    await productSurface.render({
      methodsParams: { pid: productData.pid, quantity: productData.quantity },
      extraProps: { isExpressProduct: true, productData },
    });
  } catch {
    productSurface.destroy();
  }
};

const refreshButtons = (): void => {
  productSurface.destroy();
  initAndRender();
};

export const initProductExpressCheckout = (): void => {
  const container = document.getElementById('awx-express-checkout-product');
  if (!container) return;

  initAndRender();

  $('body').on(
    'product:afterAttributeSelect',
    (_e: JQuery.Event, response: { data?: { product?: { id: string } } }) => {
      const newPid = response?.data?.product?.id;
      if (newPid) {
        container.setAttribute('data-product-id', newPid);
      }
      refreshButtons();
    },
  );

  $(document).on('change', '.quantity-select', refreshButtons);
};
