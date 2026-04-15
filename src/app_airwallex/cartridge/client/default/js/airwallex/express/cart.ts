import { initAirwallexSDK } from '../utils/sdk';
import {
  CART_CONTAINER_IDS,
  isExpressCheckoutEnabled,
  isCartExpressCheckoutRendered,
  renderCartExpressCheckout,
  destroyCartExpressCheckout,
} from './index';

const ensureHttpClient = (): void => {
  if (typeof window.httpClient !== 'undefined') return;
  if (!window.axios || !window.airwallexBaseUrl) return;
  const { axios, airwallexBaseUrl } = window;
  window.httpClient = axios.create({
    baseURL: airwallexBaseUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformRequest: [
      (data: Record<string, string> | undefined) => {
        if (!data) return data;
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => {
          params.append(key, data[key]);
        });
        const csrfEl = document.getElementById('airwallex-csrf-token') as HTMLInputElement | null;
        if (csrfEl) params.append('csrf_token', csrfEl.value);
        return params;
      },
    ],
  });
};

/**
 * The SDK and axios <script> tags are injected via the checkoutButtons.isml
 * template inside the mini-cart AJAX response. jQuery executes inline scripts
 * immediately but loads external scripts asynchronously, so they may not be
 * ready when our MutationObserver fires. Poll up to 3 s (15 × 200 ms) for
 * both globals to appear before giving up silently.
 */
const waitForDependencies = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const check = (attempts: number) => {
      ensureHttpClient();
      if (typeof window.httpClient !== 'undefined' && typeof window.AirwallexComponentsSDK !== 'undefined') {
        resolve();
      } else if (attempts > 0) {
        setTimeout(() => check(attempts - 1), 200);
      } else {
        reject(new Error('Express checkout dependencies not available after timeout'));
      }
    };
    check(15);
  });
};

const initAndRender = async(): Promise<void> => {
  if (isCartExpressCheckoutRendered()) return;
  if (!window.airwallexConfig) return;
  if (!isExpressCheckoutEnabled()) return;

  const googlePayContainer = document.getElementById(CART_CONTAINER_IDS.googlePay);
  const applePayContainer = document.getElementById(CART_CONTAINER_IDS.applePay);
  if (!googlePayContainer && !applePayContainer) return;

  try {
    await waitForDependencies();
    if (!window.httpClient) return;
    await initAirwallexSDK();
    await renderCartExpressCheckout();
  } catch {
    destroyCartExpressCheckout();
  }
};

export const initCartExpressCheckout = (): void => {
  $('body').on('cart:update', destroyCartExpressCheckout);

  const minicartEl = document.querySelector('.minicart');
  if (!minicartEl) return;

  const popoverEl = minicartEl.querySelector('.popover');
  if (!popoverEl) return;

  const hasExpressCheckoutContainers = (): boolean =>
    !!document.getElementById(CART_CONTAINER_IDS.applePay) || !!document.getElementById(CART_CONTAINER_IDS.googlePay);

  // Mini-cart: SFRA loads the popover content via AJAX on hover. The
  // observer detects when the AJAX HTML is inserted into the popover DOM.
  const observer = new MutationObserver(mutations => {
    if (isCartExpressCheckoutRendered()) return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0 && hasExpressCheckoutContainers()) {
        initAndRender();
        return;
      }
    }
  });

  observer.observe(popoverEl, { childList: true, subtree: true });

  // Full cart page: the checkoutButtons.isml content is rendered
  // server-side as part of the page, so the containers already exist
  // in the DOM before this code runs. The observer would never fire.
  if (hasExpressCheckoutContainers()) {
    initAndRender();
  }
};
