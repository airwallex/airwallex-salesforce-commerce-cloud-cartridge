type CardPaymentIntentValidationStatus = 'valid' | 'stale' | 'unavailable';

export interface CardPaymentIntentValidationResult {
  status: CardPaymentIntentValidationStatus;
}

const isValidationStatus = (value: unknown): value is CardPaymentIntentValidationStatus =>
  value === 'valid' || value === 'stale' || value === 'unavailable';

export const validateCardPaymentIntent = async(
  paymentIntentId: string,
): Promise<CardPaymentIntentValidationResult> => {
  try {
    const response = await window.httpClient.post('Airwallex-ValidateCardPaymentIntent', {
      paymentIntentId,
    });
    const status = (response.data as { status?: unknown } | null)?.status;
    return isValidationStatus(status) ? { status } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
};
