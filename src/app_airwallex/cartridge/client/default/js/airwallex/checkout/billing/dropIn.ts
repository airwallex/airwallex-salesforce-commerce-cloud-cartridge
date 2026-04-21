import type { Payment } from '@airwallex/components-sdk';
import type { CardElementState, OrderAddress, Quote } from '../../../types';
import { generateBilling } from './helpers';
import { displayQuote } from '../../utils/quote';

let dropInState: CardElementState<Payment.DropInElementType> | null = null;

export interface RenderDropInParams {
  paymentIntentId: string;
  clientSecret: string;
  currency: string;
  continueUrl: string;
  billingAddress: OrderAddress;
  orderEmail: string;
}

export const renderDropIn = async({
  paymentIntentId,
  clientSecret,
  currency,
  continueUrl,
  billingAddress,
  orderEmail,
}: RenderDropInParams): Promise<void> => {
  $('.place-order').hide();

  const paymentDetails = document.querySelector('.payment-details') as HTMLDivElement;
  paymentDetails.textContent = '';

  const element = await window.AirwallexComponentsSDK.createElement('dropIn', {
    intent_id: paymentIntentId,
    client_secret: clientSecret,
    currency,
    autoCapture: window.airwallexConfig.autoCapture,
    methods: window.airwallexConfig.paymentMethods as Payment.PaymentMethodType[],
    country_code: billingAddress.countryCode.value,
    billing: generateBilling(billingAddress, orderEmail),
    shopper_email: orderEmail,
    shopper_name: `${billingAddress.firstName} ${billingAddress.lastName}`.trim(),
    shopper_phone: billingAddress.phone,
  });

  element?.mount(paymentDetails);

  dropInState = { element, container: paymentDetails, complete: false };

  // @ts-ignore
  element?.on('quoteCreate', (event: CustomEvent<{ quote: Quote }>) => {
    displayQuote(event.detail.quote);
  });

  element?.on('success', () => {
    window.location.href = continueUrl;
  });
};

export const destroyDropIn = () => {
  dropInState?.element?.destroy();
  dropInState = null;
};
