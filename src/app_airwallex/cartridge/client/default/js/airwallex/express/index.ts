import { GooglePay } from './paymentMethods/googlePay';
import { ApplePay } from './paymentMethods/applePay';
import type { ExpressCheckoutMethodsResponse } from '../../types';

const state: {
  googlePay: GooglePay | null;
  applePay: ApplePay | null;
} = {
  googlePay: null,
  applePay: null,
};

const APPLE_PAY_CONTAINER_ID = 'awx-apple-pay';
const GOOGLE_PAY_CONTAINER_ID = 'awx-google-pay';

const getExpressCheckoutMethods = async(): Promise<ExpressCheckoutMethodsResponse> => {
  const response = await window.httpClient.get<ExpressCheckoutMethodsResponse>('Airwallex-ExpressCheckoutMethods');
  return response.data;
};

const renderGooglePay = async(googlePay: GooglePay, container: HTMLDivElement) => {
  state.googlePay = googlePay;
  await googlePay.createElement(container);
  googlePay.mount();
  googlePay.listenToEvents();
};

const renderApplePay = async(applePay: ApplePay, container: HTMLDivElement) => {
  state.applePay = applePay;
  await applePay.createElement(container);
  applePay.mount();
  applePay.listenToEvents();
};

export const renderExpressCheckout = async() => {
  const config = window.airwallexConfig;
  const applePayEnabled = config?.applePayEnabled ?? false;
  const googlePayEnabled = config?.googlePayEnabled ?? false;
  const noneEnabled = !applePayEnabled && !googlePayEnabled;
  const cardSchemes = config?.cardSchemes ?? [];
  if (noneEnabled || cardSchemes.length === 0) {
    return;
  }
  const res = await getExpressCheckoutMethods();
  const renderPromises: Promise<void>[] = [];
  if (googlePayEnabled) {
    const googlePay = new GooglePay({
      amount: res.amount,
      countryCode: res.countryCode,
      storeName: res.storeName,
      shippingAddressCountryOptions: res.shippingAddressCountryOptions,
    });
    renderPromises.push(renderGooglePay(googlePay, document.getElementById(GOOGLE_PAY_CONTAINER_ID) as HTMLDivElement));
  }
  if (applePayEnabled) {
    const applePay = new ApplePay({
      amount: res.amount,
      countryCode: res.countryCode,
      storeName: res.storeName,
      shippingAddressCountryOptions: res.shippingAddressCountryOptions,
    });
    renderPromises.push(renderApplePay(applePay, document.getElementById(APPLE_PAY_CONTAINER_ID) as HTMLDivElement));
  }
  await Promise.all(renderPromises);
};
