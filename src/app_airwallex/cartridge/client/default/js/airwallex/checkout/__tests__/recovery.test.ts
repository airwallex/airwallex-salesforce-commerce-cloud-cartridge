import { createCardCheckoutRecovery } from '../recovery';

const setupRecovery = ({
  href = 'https://shop.example/checkout?stage=placeOrder#placeOrder',
  hasCardSummary = true,
  hasRecoveryRequest = false,
  recoveryRequest = null,
  navigationError,
  canShowMessage = true,
}: {
  href?: string;
  hasCardSummary?: boolean;
  hasRecoveryRequest?: boolean;
  recoveryRequest?: 'reenter' | 'declined' | 'failed' | null;
  navigationError?: Error;
  canShowMessage?: boolean;
} = {}) => {
  let currentHref = href;
  const navigateTo = jest.fn<void, [string]>();
  if (navigationError) {
    navigateTo.mockImplementation(() => {
      throw navigationError;
    });
  }
  const replaceHistory = jest.fn((url: string) => {
    currentHref = url;
  });
  const showMessage = jest.fn(() => canShowMessage);
  const guardPlaceOrder = jest.fn();
  const clearRecoveryRequest = jest.fn();
  const recovery = createCardCheckoutRecovery({
    clearRecoveryRequest,
    getCurrentUrl: () => currentHref,
    getCurrentStage: () => new URL(currentHref).searchParams.get('stage'),
    hasCardSummary: () => hasCardSummary,
    hasRecoveryRequest: () => hasRecoveryRequest,
    guardPlaceOrder,
    navigateTo,
    replaceHistory,
    showMessage,
    ...(recoveryRequest ? { getRecoveryRequest: () => recoveryRequest } : {}),
    getRecoveryMessage: reason => {
      if (reason === 'declined') {
        return 'Payment was declined. Please try another card or payment method.';
      }
      if (reason === 'failed') {
        return 'Payment failed';
      }
      return 'Please re-enter your card details to continue.';
    },
  });

  return { clearRecoveryRequest, guardPlaceOrder, navigateTo, recovery, replaceHistory, showMessage };
};

describe('card checkout recovery', () => {
  it('redirects a hard-refreshed card Review to Billing once', () => {
    const { guardPlaceOrder, navigateTo, recovery } = setupRecovery({
      href: 'https://shop.example/checkout?foo=bar&stage=placeOrder&client_secret=sensitive#placeOrder',
    });

    expect(recovery.recoverReview()).toBe(true);
    expect(recovery.recoverReview()).toBe(true);

    expect(guardPlaceOrder).toHaveBeenCalledTimes(2);
    expect(navigateTo).toHaveBeenCalledTimes(1);
    const recoveryUrl = new URL(navigateTo.mock.calls[0][0]);
    expect(recoveryUrl.searchParams.get('stage')).toBe('payment');
    expect(recoveryUrl.searchParams.has('foo')).toBe(false);
    expect(recoveryUrl.searchParams.get('awx_card_recovery')).toBe('reenter');
    expect(recoveryUrl.hash).toBe('#payment');
    expect(recoveryUrl.toString()).not.toContain('secret');
  });

  it('does not redirect Review for a non-card payment summary', () => {
    const { navigateTo, recovery } = setupRecovery({ hasCardSummary: false });

    expect(recovery.recoverReview()).toBe(false);
    expect(recovery.shouldHidePlaceOrder()).toBe(true);
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('does not hide Place Order for a recoverable card Review', () => {
    const { recovery } = setupRecovery();

    expect(recovery.shouldHidePlaceOrder()).toBe(false);
  });

  it('fails closed when Review recovery navigation throws', () => {
    const { guardPlaceOrder, navigateTo, recovery } = setupRecovery({
      navigationError: new Error('Navigation blocked'),
    });

    expect(() => recovery.recoverReview()).not.toThrow();
    expect(recovery.recoverReview()).toBe(true);
    expect(guardPlaceOrder).toHaveBeenCalledTimes(2);
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });

  it('recovers card Review after an invalid payload removes its summary', () => {
    const { navigateTo, recovery } = setupRecovery({ hasCardSummary: false });

    recovery.requireCardRecovery();

    expect(recovery.isCardReview()).toBe(true);
    expect(recovery.recoverReview()).toBe(true);
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });

  it('shows the localized recovery prompt and removes its URL flag', () => {
    const { recovery, replaceHistory, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment&awx_card_recovery=reenter#payment',
    });

    expect(recovery.showRecoveryMessage()).toBe(true);

    expect(showMessage).toHaveBeenCalledWith('Please re-enter your card details to continue.');
    expect(replaceHistory).toHaveBeenCalledTimes(1);
    const cleanedUrl = new URL(replaceHistory.mock.calls[0][0]);
    expect(cleanedUrl.searchParams.get('stage')).toBe('payment');
    expect(cleanedUrl.searchParams.has('awx_card_recovery')).toBe(false);
  });

  it('returns a declined confirmation to Billing with a safe recovery reason', () => {
    const { navigateTo, recovery } = setupRecovery();

    expect(recovery.recoverConfirmationFailure('declined')).toBe(true);

    const recoveryUrl = new URL(navigateTo.mock.calls[0][0]);
    expect(recoveryUrl.searchParams.get('stage')).toBe('payment');
    expect(recoveryUrl.searchParams.get('awx_card_recovery')).toBe('declined');
    expect(recoveryUrl.hash).toBe('#payment');
  });

  it('returns a failed confirmation to Billing with a safe recovery reason', () => {
    const { navigateTo, recovery } = setupRecovery();

    expect(recovery.recoverConfirmationFailure('failed')).toBe(true);

    const recoveryUrl = new URL(navigateTo.mock.calls[0][0]);
    expect(recoveryUrl.searchParams.get('stage')).toBe('payment');
    expect(recoveryUrl.searchParams.get('awx_card_recovery')).toBe('failed');
  });

  it('shows the localized decline message after returning to Billing', () => {
    const { recovery, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment&awx_card_recovery=declined#payment',
    });

    expect(recovery.showRecoveryMessage()).toBe(true);
    expect(showMessage).toHaveBeenCalledWith('Payment was declined. Please try another card or payment method.');
  });

  it('shows the prompt from the server-captured request after SFRA cleans the URL', () => {
    const { clearRecoveryRequest, recovery, replaceHistory, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment#payment',
      hasRecoveryRequest: true,
    });

    expect(recovery.showRecoveryMessage()).toBe(true);

    expect(showMessage).toHaveBeenCalledWith('Please re-enter your card details to continue.');
    expect(clearRecoveryRequest).toHaveBeenCalledTimes(1);
    expect(replaceHistory).not.toHaveBeenCalled();
  });

  it.each([
    ['declined', 'Payment was declined. Please try another card or payment method.'],
    ['failed', 'Payment failed'],
  ] as const)('shows the %s message from the captured recovery reason after SFRA cleans the URL', (reason, message) => {
    const { recovery, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment#payment',
      recoveryRequest: reason,
    });

    expect(recovery.showRecoveryMessage()).toBe(true);
    expect(showMessage).toHaveBeenCalledWith(message);
  });

  it('keeps the recovery flag when the message target is not ready', () => {
    const { recovery, replaceHistory, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment&awx_card_recovery=reenter#payment',
      canShowMessage: false,
    });

    expect(recovery.showRecoveryMessage()).toBe(false);
    expect(showMessage).toHaveBeenCalledWith('Please re-enter your card details to continue.');
    expect(replaceHistory).not.toHaveBeenCalled();
  });

  it('redisplays the recovery prompt after DOM replacement until card recovery is cleared', () => {
    const { recovery, replaceHistory, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment&awx_card_recovery=reenter#payment',
    });

    expect(recovery.showRecoveryMessage()).toBe(true);
    expect(replaceHistory).toHaveBeenCalledTimes(1);
    showMessage.mockClear();

    expect(recovery.showRecoveryMessage()).toBe(true);
    expect(showMessage).toHaveBeenCalledTimes(1);

    recovery.clearCardRecovery();

    expect(recovery.showRecoveryMessage()).toBe(false);
  });

  it('ignores Billing loads without the recovery flag', () => {
    const { recovery, replaceHistory, showMessage } = setupRecovery({
      href: 'https://shop.example/checkout?stage=payment#payment',
    });

    expect(recovery.showRecoveryMessage()).toBe(false);
    expect(showMessage).not.toHaveBeenCalled();
    expect(replaceHistory).not.toHaveBeenCalled();
  });
});
