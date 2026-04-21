import { initAirwallexSDK } from '../utils/sdk';
import { waitForDependencies } from './shared/dependencies';
import { CART_CONTAINER_IDS, cartSurface, isExpressCheckoutEnabled } from './index';

const initAndRender = async(): Promise<void> => {
  if (cartSurface.isRendered()) return;
  if (!window.airwallexConfig) return;
  if (!isExpressCheckoutEnabled()) return;

  const googlePayContainer = document.getElementById(CART_CONTAINER_IDS.googlePay);
  const applePayContainer = document.getElementById(CART_CONTAINER_IDS.applePay);
  if (!googlePayContainer && !applePayContainer) return;

  try {
    await waitForDependencies();
    if (!window.httpClient) return;
    await initAirwallexSDK();
    await cartSurface.render();
  } catch {
    cartSurface.destroy();
  }
};

export const initCartExpressCheckout = (): void => {
  $('body').on('cart:update', () => cartSurface.destroy());

  const minicartEl = document.querySelector('.minicart');
  if (!minicartEl) return;

  const popoverEl = minicartEl.querySelector('.popover');
  if (!popoverEl) return;

  const hasContainers = (): boolean =>
    !!document.getElementById(CART_CONTAINER_IDS.applePay) || !!document.getElementById(CART_CONTAINER_IDS.googlePay);

  const observer = new MutationObserver(mutations => {
    if (cartSurface.isRendered()) return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0 && hasContainers()) {
        initAndRender();
        return;
      }
    }
  });

  observer.observe(popoverEl, { childList: true, subtree: true });

  if (hasContainers()) {
    initAndRender();
  }
};
