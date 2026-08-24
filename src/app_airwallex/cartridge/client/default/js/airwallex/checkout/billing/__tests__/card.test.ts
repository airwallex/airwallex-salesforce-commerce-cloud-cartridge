import { cardState, renderCard, updateCardSummary } from '../card';

const setupCardElements = () => {
  const cardNumberChangeHandlers: Array<(event: { detail: { complete: boolean; brand?: unknown } }) => void> = [];
  const cardNumberElement = {
    mount: jest.fn(),
    on: jest.fn((eventName: string, handler: (event: { detail: { complete: boolean; brand?: unknown } }) => void) => {
      if (eventName === 'change') {
        cardNumberChangeHandlers.push(handler);
      }
    }),
    destroy: jest.fn(),
  };
  const expiryElement = {
    mount: jest.fn(),
    on: jest.fn(),
    focus: jest.fn(),
    destroy: jest.fn(),
  };
  const cvcElement = {
    mount: jest.fn(),
    on: jest.fn(),
    focus: jest.fn(),
    destroy: jest.fn(),
  };
  const createElement = jest
    .fn()
    .mockResolvedValueOnce(cardNumberElement)
    .mockResolvedValueOnce(expiryElement)
    .mockResolvedValueOnce(cvcElement);

  Object.defineProperty(window, 'AirwallexComponentsSDK', {
    configurable: true,
    value: { createElement },
  });
  Object.defineProperty(window, 'airwallexConfig', {
    configurable: true,
    value: { cardSchemes: ['visa'] },
  });
  Object.defineProperty(window, 'i18nResources', {
    configurable: true,
    value: { card: 'Card' },
  });

  return { cardNumberChangeHandlers };
};

describe('card elements', () => {
  beforeEach(() => {
    cardState.brand = null;
    document.body.innerHTML = `
      <div id="airwallex-card-number"></div>
      <div id="airwallex-card-expiry"></div>
      <div id="airwallex-card-cvc"></div>
      <div class="payment-details">
        <span>Credit undefined</span>
        <div>null</div>
        <div><span>Ending undefined/undefined</span></div>
      </div>
    `;
  });

  it('replaces incomplete SFCC card details with the detected card brand', async() => {
    const { cardNumberChangeHandlers } = setupCardElements();

    await renderCard();
    cardNumberChangeHandlers.forEach(handler => {
      handler({ detail: { complete: true, brand: 'visa' } });
    });
    updateCardSummary();

    const paymentDetails = document.querySelector('.payment-details');
    expect(cardState.cardNumber?.complete).toBe(true);
    expect(cardState.brand).toBe('visa');
    expect(paymentDetails?.querySelector('.credit-card-type')?.textContent).toBe('Card');
    expect(paymentDetails?.querySelector('[data-awx-card-summary]')).not.toBeNull();
    expect(paymentDetails?.querySelector('[data-awx-card-brand]')?.textContent).toBe('Visa');
    expect(paymentDetails?.textContent).not.toContain('undefined');
    expect(paymentDetails?.textContent).not.toContain('null');
  });

  it.each(['future-brand', 123])('falls back safely for unsupported brand value %s', async brand => {
    const { cardNumberChangeHandlers } = setupCardElements();

    await renderCard();
    cardNumberChangeHandlers.forEach(handler => {
      handler({ detail: { complete: true, brand } });
    });
    updateCardSummary();

    const paymentDetails = document.querySelector('.payment-details');
    expect(paymentDetails?.querySelector('.credit-card-type')?.textContent).toBe('Card');
    expect(paymentDetails?.querySelector('[data-awx-card-brand]')?.textContent).toBe('');
  });

  it('removes the error border when an element becomes valid', async() => {
    const { cardNumberChangeHandlers } = setupCardElements();
    const cardNumberContainer = document.getElementById('airwallex-card-number')!;
    cardNumberContainer.classList.add('error');

    await renderCard();
    cardNumberChangeHandlers.forEach(handler => {
      handler({ detail: { complete: true, brand: 'visa' } });
    });

    expect(cardNumberContainer.classList.contains('error')).toBe(false);
  });
});
