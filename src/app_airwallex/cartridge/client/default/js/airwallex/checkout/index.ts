import {
  handleUpdateCheckoutView,
  handleCheckoutStageChange,
  hasPendingCardPayment,
  renderCard,
  setupCardPlaceOrderInterception,
  destroyCard,
  validateCardForm,
} from './billing';
import { checkoutSurface } from '../express/index';
import { waitForDependencies } from '../express/shared/dependencies';
import { initAirwallexSDK } from '../utils/sdk';
import type { Order } from '../../types';
import { displayError } from './billing/helpers';
import { createCardCheckoutRecovery } from './recovery';

const getCurrentCheckoutStage = (): string | null =>
  document.getElementById('checkout-main')?.getAttribute('data-checkout-stage') ??
  new URL(window.location.href).searchParams.get('stage');

const cardCheckoutRecovery = createCardCheckoutRecovery({
  clearRecoveryRequest: () => {
    window.__awxCardRecoveryRequested = false;
    window.__awxCardRecoveryReason = null;
  },
  getCurrentUrl: () => window.location.href,
  getCurrentStage: getCurrentCheckoutStage,
  hasCardSummary: () => document.querySelector('[data-awx-card-summary]') !== null,
  hasRecoveryRequest: () => window.__awxCardRecoveryRequested === true,
  getRecoveryRequest: () => window.__awxCardRecoveryReason ?? null,
  guardPlaceOrder: () => {
    const placeOrderButton = document.querySelector<HTMLButtonElement>('.place-order');
    if (placeOrderButton) {
      placeOrderButton.disabled = true;
      placeOrderButton.style.display = 'none';
    }
  },
  navigateTo: url => window.location.replace(url),
  replaceHistory: url => window.history.replaceState(window.history.state, '', url),
  showMessage: displayError,
  getRecoveryMessage: reason => {
    if (reason === 'declined') return window.i18nResources.paymentDeclined;
    if (reason === 'failed') return window.i18nResources.paymentFailed;
    return window.i18nResources.reenterCard;
  },
});

const isCardPaymentSelected = (): boolean =>
  document.querySelector<HTMLInputElement>('input.awx-payment-method-radio[value="AirwallexCreditCard"]:checked') !==
  null;

let cardRenderPromise: Promise<void> | null = null;

const renderCardOnce = (): Promise<void> => {
  if (cardRenderPromise) {
    return cardRenderPromise;
  }

  const trackedPromise = renderCard().finally(() => {
    if (cardRenderPromise === trackedPromise) {
      cardRenderPromise = null;
    }
  });
  cardRenderPromise = trackedPromise;
  return trackedPromise;
};

const selectPaymentMethod = async(methodId: string): Promise<void> => {
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
    try {
      await renderCardOnce();
    } catch {
      if (isCardPaymentSelected()) {
        displayError(window.i18nResources.paymentFailed);
      }
    }
    if (!isCardPaymentSelected()) {
      destroyCard();
    }
  } else {
    cardCheckoutRecovery.clearCardRecovery();
    destroyCard();
  }
};

const setupPaymentMethodTabs = async(): Promise<void> => {
  const container = $('.payment-information');
  const initPaymentMethod = container.data('payment-method-id') as string;
  const paymentMethodRadios = document.querySelectorAll<HTMLInputElement>(
    'input[type="radio"].awx-payment-method-radio',
  );
  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const methodId = radio.value as string;
      void selectPaymentMethod(methodId);
    });
  });

  await selectPaymentMethod(initPaymentMethod);
};

const syncCheckoutExpressCheckout = (stage: string | null): void => {
  const isReview = stage === 'placeOrder';
  const container = document.getElementById('awx-express-checkout');
  if (container) {
    container.hidden = isReview;
  }
  if (isReview) {
    checkoutSurface.destroy();
    return;
  }
  void checkoutSurface.render();
};

const setupCheckoutEvents = (): void => {
  let isBillingSubmissionPending = false;
  const handleStageChange = (newStage: string): void => {
    syncCheckoutExpressCheckout(newStage);
    const canContinue = handleCheckoutStageChange(newStage);
    if (!canContinue) {
      cardCheckoutRecovery.recoverReview();
      return;
    }
    if (newStage === 'placeOrder' && hasPendingCardPayment()) {
      $('.place-order').show();
    }
  };

  $('body').on('checkout:updateCheckoutView', (_, data?: { order?: Order }) => {
    const isBillingResponse = isBillingSubmissionPending;
    handleUpdateCheckoutView(data?.order, isBillingResponse);
    const isCardSelected = isCardPaymentSelected();
    const hasPendingCard = hasPendingCardPayment();
    if (isBillingResponse) {
      if (isCardSelected && !hasPendingCard) {
        cardCheckoutRecovery.requireCardRecovery();
      } else {
        cardCheckoutRecovery.clearCardRecovery();
      }
    }
    isBillingSubmissionPending = false;
    if (isBillingResponse && getCurrentCheckoutStage() === 'placeOrder') {
      handleStageChange('placeOrder');
    }
    setupUIElements();
  });

  $('body').on('checkout:serializeBilling', () => {
    validateCardForm();
    isBillingSubmissionPending = true;
  });

  $('body').on('checkout:enableButton', () => {
    Promise.resolve().then(() => {
      isBillingSubmissionPending = false;
    });
  });

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === 'data-checkout-stage' && m.target instanceof HTMLDivElement) {
        const newStage = m.target.getAttribute('data-checkout-stage');
        if (newStage) {
          if (newStage === 'placeOrder' && isBillingSubmissionPending) {
            return;
          }
          handleStageChange(newStage);
        }
      }
    });
  });
  observer.observe(document.querySelector('#checkout-main') as HTMLDivElement, {
    attributes: true,
    attributeFilter: ['data-checkout-stage'],
  });

  setupCardPlaceOrderInterception({
    isCardReview: () => cardCheckoutRecovery.isCardReview(),
    recoverConfirmationFailure: reason => cardCheckoutRecovery.recoverConfirmationFailure(reason),
    recoverReview: () => cardCheckoutRecovery.recoverReview(),
  });
};

const setupUIElements = (): void => {
  cardCheckoutRecovery.showRecoveryMessage();
};

const init = (): void => {
  $(document).ready(async() => {
    if (cardCheckoutRecovery.recoverReview()) {
      return;
    }
    if (cardCheckoutRecovery.shouldHidePlaceOrder()) {
      $('.place-order').hide();
    }

    await waitForDependencies();
    await initAirwallexSDK();
    setupCheckoutEvents();
    setupUIElements();
    await setupPaymentMethodTabs();
    setupUIElements();
    syncCheckoutExpressCheckout(getCurrentCheckoutStage());
  });
};

export { init };

module.exports = { init };
