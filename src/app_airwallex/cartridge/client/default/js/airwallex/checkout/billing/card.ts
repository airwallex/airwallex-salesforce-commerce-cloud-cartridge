import type { Payment } from '@airwallex/components-sdk';
import type { SplitCardElement, CardElementState } from '../../../types';
import { displayError, clearError, isCardTabActive } from './helpers';

interface CardFormState {
  cardNumber: CardElementState<Payment.CardNumberElementType> | null;
  expiry: CardElementState<Payment.ExpiryDateElementType> | null;
  cvc: CardElementState<Payment.CvcElementType> | null;
}

export const cardState: CardFormState = {
  cardNumber: null,
  expiry: null,
  cvc: null,
};

const setupElementEvents = (
  element: SplitCardElement | null | undefined,
  container: HTMLDivElement,
  stateKey: keyof CardFormState,
): void => {
  element?.on('change', (e: CustomEvent) => {
    if (cardState[stateKey]) {
      cardState[stateKey]!.complete = e.detail.complete;
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

  cardState.cardNumber = { element: cardNumberElement, container: cardNumberContainer, complete: false };
  cardState.expiry = { element: expiryElement, container: cardExpiryContainer, complete: false };
  cardState.cvc = { element: cvcElement, container: cardCvcContainer, complete: false };

  cardNumberElement?.mount(cardNumberContainer);
  expiryElement?.mount(cardExpiryContainer);
  cvcElement?.mount(cardCvcContainer);

  cardNumberElement?.on('change', e => {
    // @ts-ignore
    if (e.detail.complete) {
      expiryElement?.focus();
    }
  });
  expiryElement?.on('change', e => {
    // @ts-ignore
    if (e.detail.complete) {
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
};

export const validateCardForm = (): void => {
  if (!isCardTabActive()) return;

  const allComplete = cardState.cardNumber?.complete && cardState.expiry?.complete && cardState.cvc?.complete;
  if (!allComplete) {
    displayError(window.i18nResources.fieldsIncomplete);
    throw new Error('Required fields not completed');
  }
};
