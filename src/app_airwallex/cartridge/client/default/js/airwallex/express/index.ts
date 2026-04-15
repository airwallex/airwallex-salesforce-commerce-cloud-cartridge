import { GooglePay } from './paymentMethods/googlePay';
import { ApplePay } from './paymentMethods/applePay';
import type { ExpressCheckoutMethodsResponse } from '../../types';

export interface ExpressCheckoutContainerIds {
  googlePay: string;
  applePay: string;
}

interface ExpressCheckoutState {
  googlePay: GooglePay | null;
  applePay: ApplePay | null;
}

const CHECKOUT_CONTAINER_IDS: ExpressCheckoutContainerIds = {
  googlePay: 'awx-google-pay',
  applePay: 'awx-apple-pay',
};

export const CART_CONTAINER_IDS: ExpressCheckoutContainerIds = {
  googlePay: 'awx-google-pay-cart',
  applePay: 'awx-apple-pay-cart',
};

const checkoutState: ExpressCheckoutState = { googlePay: null, applePay: null };
const cartState: ExpressCheckoutState = { googlePay: null, applePay: null };

export const getExpressCheckoutMethods = async(): Promise<ExpressCheckoutMethodsResponse> => {
  const response = await window.httpClient.get<ExpressCheckoutMethodsResponse>('Airwallex-ExpressCheckoutMethods');
  return response.data;
};

const renderGooglePay = async(googlePay: GooglePay, container: HTMLDivElement, state: ExpressCheckoutState) => {
  state.googlePay = googlePay;
  await googlePay.createElement(container);
  googlePay.mount();
  googlePay.listenToEvents();
};

const renderApplePay = async(applePay: ApplePay, container: HTMLDivElement, state: ExpressCheckoutState) => {
  state.applePay = applePay;
  await applePay.createElement(container);
  applePay.mount();
  applePay.listenToEvents();
};

export const isExpressCheckoutEnabled = (): boolean => {
  const config = window.airwallexConfig;
  const applePayEnabled = config?.applePayEnabled ?? false;
  const googlePayEnabled = config?.googlePayEnabled ?? false;
  const cardSchemes = config?.cardSchemes ?? [];
  return (applePayEnabled || googlePayEnabled) && cardSchemes.length > 0;
};

const isRendered = (state: ExpressCheckoutState): boolean => state.googlePay !== null || state.applePay !== null;

const destroyState = (state: ExpressCheckoutState): void => {
  if (state.googlePay?.element) {
    state.googlePay.element.destroy();
  }
  if (state.applePay?.element) {
    state.applePay.element.destroy();
  }
  state.googlePay = null;
  state.applePay = null;
};

const renderExpressCheckoutInContainers = async(
  containerIds: ExpressCheckoutContainerIds,
  state: ExpressCheckoutState,
): Promise<void> => {
  if (isRendered(state)) return;

  const config = window.airwallexConfig;
  const applePayEnabled = config?.applePayEnabled ?? false;
  const googlePayEnabled = config?.googlePayEnabled ?? false;

  if (!isExpressCheckoutEnabled()) {
    return;
  }

  const res = await getExpressCheckoutMethods();
  const renderPromises: Promise<void>[] = [];

  if (googlePayEnabled) {
    const container = document.getElementById(containerIds.googlePay) as HTMLDivElement;
    if (container) {
      const googlePay = new GooglePay({
        amount: res.amount,
        countryCode: res.countryCode,
        storeName: res.storeName,
        shippingAddressCountryOptions: res.shippingAddressCountryOptions,
      });
      renderPromises.push(renderGooglePay(googlePay, container, state));
    }
  }

  if (applePayEnabled) {
    const container = document.getElementById(containerIds.applePay) as HTMLDivElement;
    if (container) {
      const applePay = new ApplePay({
        amount: res.amount,
        countryCode: res.countryCode,
        storeName: res.storeName,
        shippingAddressCountryOptions: res.shippingAddressCountryOptions,
      });
      renderPromises.push(renderApplePay(applePay, container, state));
    }
  }

  await Promise.all(renderPromises);
};

export const renderExpressCheckout = async(): Promise<void> => {
  await renderExpressCheckoutInContainers(CHECKOUT_CONTAINER_IDS, checkoutState);
};

export const renderCartExpressCheckout = async(): Promise<void> => {
  await renderExpressCheckoutInContainers(CART_CONTAINER_IDS, cartState);
};

export const isCartExpressCheckoutRendered = (): boolean => isRendered(cartState);

export const destroyCartExpressCheckout = (): void => {
  destroyState(cartState);
};
