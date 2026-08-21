import type { Payment } from '@airwallex/components-sdk';
import type { SplitCardElement, CardElementState } from '../../../types';
import { displayError, clearError, isCardTabActive } from './helpers';

interface CardFormState {
  cardNumber: CardElementState<Payment.CardNumberElementType> | null;
  expiry: CardElementState<Payment.ExpiryDateElementType> | null;
  cvc: CardElementState<Payment.CvcElementType> | null;
  brand: string | null;
}

type CardElementStateKey = 'cardNumber' | 'expiry' | 'cvc';

interface RuntimeSplitElementDetail {
  complete?: boolean;
  completed?: boolean;
  brand?: unknown;
}

export const cardState: CardFormState = {
  cardNumber: null,
  expiry: null,
  cvc: null,
  brand: null,
};

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  maestro: 'Maestro',
  unionpay: 'UnionPay',
  amex: 'American Express',
  jcb: 'JCB',
  diners: 'Diners Club',
  discover: 'Discover',
};

export const updateCardSummary = (): void => {
  const paymentDetails = document.querySelector<HTMLElement>('.payment-details');
  if (!paymentDetails) return;

  let cardNumberElement = paymentDetails.querySelector<HTMLElement>('[data-awx-card-brand]');
  if (!cardNumberElement) {
    const cardTypeElement = document.createElement('div');
    cardTypeElement.className = 'credit-card-type';
    cardTypeElement.textContent = window.i18nResources.card;

    cardNumberElement = document.createElement('div');
    cardNumberElement.className = 'credit-card-number';
    cardNumberElement.setAttribute('data-awx-card-brand', '');
    paymentDetails.replaceChildren(cardTypeElement, cardNumberElement);
  }

  paymentDetails.querySelector<HTMLElement>('.credit-card-type')?.setAttribute('data-awx-card-summary', '');
  cardNumberElement.textContent = cardState.brand ? (CARD_BRAND_LABELS[cardState.brand] ?? '') : '';
};

const isElementComplete = (detail: RuntimeSplitElementDetail): boolean => detail.complete ?? detail.completed ?? false;

const setupElementEvents = (
  element: SplitCardElement | null | undefined,
  container: HTMLDivElement,
  stateKey: CardElementStateKey,
): void => {
  element?.on('change', e => {
    const isComplete = isElementComplete(e.detail);
    if (cardState[stateKey]) {
      cardState[stateKey]!.complete = isComplete;
    }
    if (isComplete) {
      container.classList.remove('error');
    }
  });

  element?.on('focus', () => {
    container.classList.add('focused');
    container.classList.remove('error');
    clearError();
  });

  element?.on('blur', e => {
    container.classList.remove('focused');
    if (!cardState[stateKey]?.complete) {
      container.classList.add('error');
    }
    if (e.detail.error?.message) {
      displayError(e.detail.error.message);
    }
  });
};

export const renderCard = async(): Promise<void> => {
  const cardNumberContainer = document.getElementById('airwallex-card-number') as HTMLDivElement;
  const cardExpiryContainer = document.getElementById('airwallex-card-expiry') as HTMLDivElement;
  const cardCvcContainer = document.getElementById('airwallex-card-cvc') as HTMLDivElement;

  const elementStyle = {
    base: {
      '::placeholder': {
        color: '#878E99',
      },
    },
  } as unknown as Payment.InputStyle;
  const cardNumberElement = await window.AirwallexComponentsSDK.createElement('cardNumber', {
    allowedCardNetworks: window.airwallexConfig.cardSchemes as Payment.CardNetwork[],
    placeholder: '1234 1234 1234 1234',
    style: elementStyle,
  });
  const expiryElement = await window.AirwallexComponentsSDK.createElement('expiry', {
    style: elementStyle,
  });
  const cvcElement = await window.AirwallexComponentsSDK.createElement('cvc', {
    placeholder: 'CVC',
    style: elementStyle,
  });

  cardState.brand = null;
  cardState.cardNumber = { element: cardNumberElement, container: cardNumberContainer, complete: false };
  cardState.expiry = { element: expiryElement, container: cardExpiryContainer, complete: false };
  cardState.cvc = { element: cvcElement, container: cardCvcContainer, complete: false };

  cardNumberElement?.mount(cardNumberContainer);
  expiryElement?.mount(cardExpiryContainer);
  cvcElement?.mount(cardCvcContainer);

  cardNumberElement?.on('change', e => {
    const detail = e.detail as typeof e.detail & RuntimeSplitElementDetail;
    cardState.brand = typeof detail.brand === 'string' ? detail.brand.toLowerCase() : null;
    if (isElementComplete(detail)) {
      expiryElement?.focus();
    }
  });
  expiryElement?.on('change', e => {
    if (isElementComplete(e.detail)) {
      cvcElement?.focus();
    }
  });

  setupElementEvents(cardNumberElement, cardNumberContainer, 'cardNumber');
  setupElementEvents(expiryElement, cardExpiryContainer, 'expiry');
  setupElementEvents(cvcElement, cardCvcContainer, 'cvc');
};

export const destroyCard = () => {
  cardState.cardNumber?.element?.destroy();
  cardState.expiry?.element?.destroy();
  cardState.cvc?.element?.destroy();
  cardState.brand = null;
};

export const validateCardForm = (): void => {
  if (!isCardTabActive()) return;

  const allComplete = cardState.cardNumber?.complete && cardState.expiry?.complete && cardState.cvc?.complete;
  if (!allComplete) {
    displayError(window.i18nResources.fieldsIncomplete);
    throw new Error('Required fields not completed');
  }
};
