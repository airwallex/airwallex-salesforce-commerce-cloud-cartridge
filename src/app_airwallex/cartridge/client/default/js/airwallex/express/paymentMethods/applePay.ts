import { ExpressCheckout } from './base';

import type { Payment, ElementOptionsTypes } from '@airwallex/components-sdk';
import type { ApplePaySessionResponse } from '../../../types';
import type { AvailableShippingOption } from '@/cartridge/scripts/airwallex/payments/shippingOptions';
import type { ExpressCheckoutAddress } from '@/cartridge/scripts/airwallex/payments/expressCheckoutAuthorization';

type ApplePayContact = Payment.ApplePayPaymentContact;

export class ApplePay extends ExpressCheckout<'applePayButton'> {
  private static formatAddress(contact: ApplePayContact): ExpressCheckoutAddress {
    const addressLines = contact.addressLines || [];

    return {
      firstName: contact.givenName || '',
      lastName: contact.familyName || '',
      address1: addressLines[0] || '',
      address2: addressLines.slice(1).join(' ') || undefined,
      city: contact.locality || contact.countryCode || '',
      stateCode: contact.administrativeArea,
      postalCode: contact.postalCode || '',
      countryCode: contact.countryCode || '',
      phone: contact.phoneNumber || '',
    };
  }

  private static formatShippingOptions(shippingOptions: AvailableShippingOption[]) {
    return shippingOptions.map(option => ({
      identifier: option.ID || '',
      label: option.displayName || '',
      detail: option.description || '',
      amount: option.shippingCostAmount ? String(option.shippingCostAmount.amount) : '0',
    }));
  }

  private static async startApplePaySession(validationURL: string) {
    const res = await window.httpClient.post<ApplePaySessionResponse>('Airwallex-ApplePaySession', {
      validationURL,
      origin: window.location.origin,
    });
    return res.data;
  }

  private static getSupportedNetworks(): string[] {
    const cardSchemeToApplePayNetwork: Record<string, string> = {
      visa: 'visa',
      mastercard: 'masterCard',
      amex: 'amex',
      discover: 'discover',
      jcb: 'jcb',
      unionpay: 'chinaUnionPay',
      maestro: 'maestro',
    };
    const cardSchemes = window.airwallexConfig.cardSchemes ?? [];
    return cardSchemes
      .map(scheme => cardSchemeToApplePayNetwork[scheme.trim().toLowerCase()])
      .filter((network): network is string => network !== undefined);
  }

  private onValidateMerchant = async(event: Payment.ApplePayButtonEvent['validateMerchant']) => {
    try {
      if (this.isExpressProduct) {
        await this.ensureTemporaryBasket();
      }
      const { validationURL } = event.detail;
      const merchantSession = await ApplePay.startApplePaySession(validationURL);
      this.element!.completeValidation(merchantSession);
    } catch {
      this.element?.update({
        errors: [{ code: 'unknown', message: window.i18nResources.merchantValidationFailed }],
      });
    }
  };

  private onAuthorized = async(event: Payment.ApplePayButtonEvent['authorized']) => {
    const { paymentData } = event.detail;
    const billingContact = paymentData.billingContact;
    const shippingContact = paymentData.shippingContact;
    const email = billingContact?.emailAddress || shippingContact?.emailAddress || '';

    if (!billingContact || !shippingContact || !email) {
      throw new Error('Invalid payment data');
    }

    const { clientSecret, redirectUrl } = await this.authorizePayment(
      ApplePay.formatAddress(billingContact),
      ApplePay.formatAddress(shippingContact),
      email,
    );
    await this.confirmAndRedirect(clientSecret, redirectUrl);
  };

  private onShippingAddressChange = async(event: Payment.ApplePayButtonEvent['shippingAddressChange']) => {
    const { shippingAddress } = event.detail;
    const updateOptions: Partial<Payment.ApplePayButtonUpdateOptions> = {};

    try {
      const shippingOptions = await this.getShippingOptions(shippingAddress);
      if (shippingOptions.length > 0) {
        const defaultShippingOption = shippingOptions[0];
        const { grandTotal } = await this.selectShippingOption(defaultShippingOption);

        updateOptions.shippingMethods = ApplePay.formatShippingOptions(shippingOptions);
        updateOptions.amount = grandTotal;
      } else {
        updateOptions.errors = [{ code: 'addressUnserviceable', message: window.i18nResources.noShippingOptions }];
      }
    } catch (error: unknown) {
      updateOptions.errors = [{ code: 'addressUnserviceable', message: this.getErrorMessage(error) }];
    }

    this.element?.update(updateOptions);
  };

  private onShippingMethodChange = async(event: Payment.ApplePayButtonEvent['shippingMethodChange']) => {
    const selectedIdentifier = event.detail.shippingMethod.identifier;
    const updateOptions: Partial<Payment.ApplePayButtonUpdateOptions> = {};

    try {
      const shippingOptions = await this.getShippingOptions({
        countryCode: this.countryCode,
      });
      const matchedOption = shippingOptions.find(option => option.ID === selectedIdentifier);

      if (matchedOption) {
        const { grandTotal } = await this.selectShippingOption(matchedOption);
        updateOptions.amount = grandTotal;
      } else {
        updateOptions.errors = [{ code: 'addressUnserviceable', message: window.i18nResources.cannotShipWithMethod }];
      }
    } catch (error: unknown) {
      updateOptions.errors = [{ code: 'addressUnserviceable', message: this.getErrorMessage(error) }];
    }

    this.element?.update(updateOptions);
  };

  protected getButtonType() {
    return 'applePayButton' as const;
  }

  protected getElementOptions(): ElementOptionsTypes['applePayButton'] {
    return {
      mode: 'payment',
      requiredBillingContactFields: ['postalAddress'],
      requiredShippingContactFields: ['email', 'name', 'phone', 'postalAddress'],
      totalPriceLabel: this.storeName,
      amount: this.originalAmount,
      countryCode: this.countryCode,
      autoCapture: window.airwallexConfig.autoCapture,
      supportedNetworks: ApplePay.getSupportedNetworks(),
    };
  }

  public listenToEvents() {
    this.element?.on('validateMerchant', this.onValidateMerchant);
    this.element?.on('authorized', this.onAuthorized);
    this.element?.on('shippingAddressChange', this.onShippingAddressChange);
    this.element?.on('shippingMethodChange', this.onShippingMethodChange);
  }
}
