import {
  handleUpdateCheckoutView,
  handleCheckoutStageChange,
  renderCard,
  destroyCard,
  validateCardForm,
} from './billing';
import { renderExpressCheckout } from '../express/index';
import type { Order } from '../../types';

const selectPaymentMethod = (methodId: string) => {
  const paymentMethodRadios = document.querySelectorAll<HTMLInputElement>(
    'input[type="radio"].awx-payment-method-radio',
  );
  paymentMethodRadios.forEach(radio => {
    const active = radio.value === methodId;
    radio.checked = active;
    const contentId = radio.getAttribute('data-content') as string;
    const paneId = radio.getAttribute('data-pane') as string;
    const contentElement = document.querySelector(contentId);
    const paneElement = document.querySelector(paneId);
    if (paneElement) {
      paneElement.classList.toggle('active', active);
    }
    if (contentElement) {
      contentElement.classList.toggle('hidden', !active);
    }
  });

  if (methodId === 'AirwallexCreditCard') {
    renderCard();
  } else {
    destroyCard();
  }
};

const setupPaymentMethodTabs = () => {
  const container = $('.payment-information');
  const initPaymentMethod = container.data('payment-method-id') as string;
  selectPaymentMethod(initPaymentMethod);

  const paymentMethodRadios = document.querySelectorAll<HTMLInputElement>(
    'input[type="radio"].awx-payment-method-radio',
  );
  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const methodId = radio.value as string;
      selectPaymentMethod(methodId);
    });
  });
};

const setupCheckoutEvents = (): void => {
  $('body').on('checkout:updateCheckoutView', (_, data: { order: Order }) => {
    handleUpdateCheckoutView(data.order);
  });

  $('body').on('checkout:serializeBilling', () => {
    validateCardForm();
  });

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === 'data-checkout-stage' && m.target instanceof HTMLDivElement) {
        const newStage = m.target.getAttribute('data-checkout-stage');
        if (newStage) {
          handleCheckoutStageChange(newStage);
        }
      }
    });
  });
  observer.observe(document.querySelector('#checkout-main') as HTMLDivElement, {
    attributes: true,
    attributeFilter: ['data-checkout-stage'],
  });
};

const setupUIElements = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const stage = searchParams.get('stage') as string;

  // If users refresh at this stage, we need to hide the place order button.
  if (stage === 'placeOrder') {
    $('.place-order').hide();
  }
};

const initAirwallexSDK = async(): Promise<void> => {
  await window.AirwallexComponentsSDK.init({
    locale: 'en',
    // @ts-ignore
    env: window.airwallexConfig.environment,
    // @ts-ignore
    enabledElements: ['payments'],
  });
};

const init = (): void => {
  $(document).ready(async() => {
    await initAirwallexSDK();
    setupPaymentMethodTabs();
    setupCheckoutEvents();
    setupUIElements();
    renderExpressCheckout();
  });
};

export { init };

module.exports = { init };
