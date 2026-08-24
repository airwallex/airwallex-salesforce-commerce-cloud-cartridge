const RECOVERY_PARAM = 'awx_card_recovery';
const REENTER_CARD_REASON = 'reenter';
type CardRecoveryReason = 'reenter' | 'declined' | 'failed';

const getRecoveryReason = (value: string | null): CardRecoveryReason | null =>
  value === 'reenter' || value === 'declined' || value === 'failed' ? value : null;

interface CardCheckoutRecoveryDependencies {
  clearRecoveryRequest: () => void;
  getCurrentUrl: () => string;
  getCurrentStage: () => string | null;
  hasCardSummary: () => boolean;
  hasRecoveryRequest: () => boolean;
  guardPlaceOrder: () => void;
  navigateTo: (url: string) => void;
  replaceHistory: (url: string) => void;
  showMessage: (message: string) => boolean;
  getRecoveryMessage: (reason: CardRecoveryReason) => string;
  getRecoveryRequest?: () => CardRecoveryReason | null;
}

interface CardCheckoutRecovery {
  clearCardRecovery: () => void;
  isCardReview: () => boolean;
  recoverConfirmationFailure: (reason: Exclude<CardRecoveryReason, 'reenter'>) => boolean;
  requireCardRecovery: () => void;
  recoverReview: () => boolean;
  shouldHidePlaceOrder: () => boolean;
  showRecoveryMessage: () => boolean;
}

export const createCardCheckoutRecovery = (dependencies: CardCheckoutRecoveryDependencies): CardCheckoutRecovery => {
  let isRedirecting = false;
  let isCardRecoveryRequired = false;
  let recoveryMessageReason: CardRecoveryReason | null = null;
  const isCardReview = (): boolean => isCardRecoveryRequired || dependencies.hasCardSummary();
  const recoverToBilling = (reason: CardRecoveryReason): boolean => {
    const url = new URL(dependencies.getCurrentUrl());
    const currentStage = dependencies.getCurrentStage();
    if (currentStage !== 'placeOrder' || !isCardReview()) {
      return false;
    }

    dependencies.guardPlaceOrder();
    if (!isRedirecting) {
      isRedirecting = true;
      url.search = '';
      url.searchParams.set('stage', 'payment');
      url.searchParams.set(RECOVERY_PARAM, reason);
      url.hash = 'payment';
      try {
        dependencies.navigateTo(url.toString());
      } catch {
        // Keep Place Order guarded when browser navigation is unavailable.
      }
    }

    return true;
  };

  return {
    clearCardRecovery: (): void => {
      isCardRecoveryRequired = false;
      recoveryMessageReason = null;
    },

    isCardReview,

    recoverConfirmationFailure: reason => recoverToBilling(reason),

    requireCardRecovery: (): void => {
      isCardRecoveryRequired = true;
    },

    recoverReview: (): boolean => recoverToBilling(REENTER_CARD_REASON),

    shouldHidePlaceOrder: (): boolean => dependencies.getCurrentStage() === 'placeOrder' && !isCardReview(),

    showRecoveryMessage: (): boolean => {
      const url = new URL(dependencies.getCurrentUrl());
      const urlRecoveryReason = getRecoveryReason(url.searchParams.get(RECOVERY_PARAM));
      const hasServerRecoveryRequest = dependencies.hasRecoveryRequest();
      const serverRecoveryReason =
        dependencies.getRecoveryRequest?.() ?? (hasServerRecoveryRequest ? REENTER_CARD_REASON : null);
      if (urlRecoveryReason || serverRecoveryReason) {
        recoveryMessageReason = urlRecoveryReason ?? serverRecoveryReason;
      }
      if (!recoveryMessageReason) {
        return false;
      }

      const wasDisplayed = dependencies.showMessage(dependencies.getRecoveryMessage(recoveryMessageReason));
      if (!wasDisplayed) {
        return false;
      }
      dependencies.clearRecoveryRequest();

      if (urlRecoveryReason) {
        const stage = url.searchParams.get('stage') ?? 'payment';
        url.search = '';
        url.searchParams.set('stage', stage);
        dependencies.replaceHistory(url.toString());
      }
      return true;
    },
  };
};
