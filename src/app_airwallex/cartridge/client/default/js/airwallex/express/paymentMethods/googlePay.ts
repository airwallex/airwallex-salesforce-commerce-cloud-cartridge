import { ExpressCheckout } from './base';

import type { Payment } from '@airwallex/components-sdk';
import type {
  ShippingOptionsResponse,
  SelectShippingMethodResponse,
  ExpressCheckoutAuthorizationResponse,
} from '../../../types';

import type { AvailableShippingOption } from '@/cartridge/scripts/airwallex/payments/shippingOptions';
import type { ExpressCheckoutAddress } from '@/cartridge/scripts/airwallex/payments/expressCheckoutAuthorization';

type GooglePayIntermediatePaymentData = Payment.GooglePayIntermediatePaymentData['detail']['intermediatePaymentData'];
type GooglePayPaymentData = Payment.GooglePayButtonEvent['authorized']['detail']['paymentData'];
type GooglePayShippingAddress = GooglePayIntermediatePaymentData['shippingAddress'];
type GooglePayAddress = NonNullable<GooglePayPaymentData['shippingAddress']>;

export class GooglePay extends ExpressCheckout<'googlePayButton'> {
  private static formatAddress(address: GooglePayAddress): ExpressCheckoutAddress {
    const nameParts = address.name?.split(' ') || [];

    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      address1: address.address1 || '',
      address2: address.address2,
      city: address.locality || address.countryCode,
      stateCode: address.administrativeArea,
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      phone: address.phoneNumber || '',
    };
  }

  private static formatShippingOptions(shippingOptions: AvailableShippingOption[]) {
    return shippingOptions.map(option => ({
      id: option.ID || '',
      label: `${option.displayName} ${option.shippingCost}`,
      description: option.description || '',
    }));
  }

  private static async getShippingOptions(address: GooglePayShippingAddress) {
    const req = {
      city: address?.locality,
      countryCode: address?.countryCode,
      stateCode: address?.administrativeArea,
      postalCode: address?.postalCode,
    };
    const res = await window.httpClient.post<ShippingOptionsResponse>('Airwallex-ShippingOptions', req);
    return res.data.shippingMethods;
  }

  private static async selectShippingOption(shippingOption: AvailableShippingOption) {
    const req = {
      shipmentUUID: shippingOption.shipmentUUID,
      shippingMethodID: shippingOption.ID,
    };
    const res = await window.httpClient.post<SelectShippingMethodResponse>('Airwallex-SelectShippingMethod', req);
    return res.data;
  }

  private static async authorizePayment(
    billingAddress: GooglePayAddress,
    shippingAddress: GooglePayAddress,
    email: string,
  ) {
    const req = {
      billingAddress: JSON.stringify(GooglePay.formatAddress(billingAddress)),
      shippingAddress: JSON.stringify(GooglePay.formatAddress(shippingAddress)),
      email,
    };
    const res = await window.httpClient.post<ExpressCheckoutAuthorizationResponse>(
      'Airwallex-ExpressCheckoutAuthorization',
      req,
    );
    return res.data;
  }

  private static getAllowedCardNetworks(): Payment.GoogleSupportedCardNetWork[] {
    const cardSchemeToGooglePayNetwork: Record<string, Payment.GoogleSupportedCardNetWork> = {
      visa: 'VISA',
      mastercard: 'MASTERCARD',
      amex: 'AMEX',
      discover: 'DISCOVER',
      jcb: 'JCB',
    };
    const cardSchemes = window.airwallexConfig.cardSchemes ?? [];
    return cardSchemes
      .map(scheme => cardSchemeToGooglePayNetwork[scheme.trim().toLowerCase()])
      .filter((network): network is Payment.GoogleSupportedCardNetWork => network !== undefined);
  }

  private onAuthorized = async(event: Payment.GooglePayButtonEvent['authorized']) => {
    const paymentData = event.detail.paymentData;
    const billingAddress = paymentData.paymentMethodData.info?.billingAddress;
    const shippingAddress = paymentData.shippingAddress;
    const email = paymentData.email;

    if (!billingAddress || !shippingAddress || !email) {
      throw new Error('Invalid payment data');
    }

    const { clientSecret, redirectUrl } = await GooglePay.authorizePayment(billingAddress, shippingAddress, email);

    const intent = await this.element!.confirmIntent({
      client_secret: clientSecret,
    });

    if (intent && redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  private onShippingAddressChange = async(event: Payment.GooglePayButtonEvent['shippingAddressChange']) => {
    const { shippingAddress } = event.detail.intermediatePaymentData;
    const paymentDataUpdate: Partial<Payment.GooglePayButtonOptions> = {};
    const shippingOptions = await GooglePay.getShippingOptions(shippingAddress);
    if (shippingOptions.length > 0) {
      const defaultShippingOption = shippingOptions[0];
      const { grandTotal } = await GooglePay.selectShippingOption(defaultShippingOption);

      paymentDataUpdate.shippingOptionParameters = {
        defaultSelectedOptionId: defaultShippingOption.ID as string,
        shippingOptions: GooglePay.formatShippingOptions(shippingOptions),
      };
      paymentDataUpdate.amount = grandTotal;
    } else {
      paymentDataUpdate.error = {
        reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
        message: window.i18nResources.noShippingOptions,
        intent: 'SHIPPING_ADDRESS',
      };
    }
    try {
      this.element?.update(paymentDataUpdate);
    } catch (error: unknown) {
      paymentDataUpdate.error = {
        reason: 'OTHER_ERROR',
        message: this.getErrorMessage(error),
        intent: 'SHIPPING_ADDRESS',
      };
    }
  };

  private onShippingMethodChange = async(event: Payment.GooglePayButtonEvent['shippingMethodChange']) => {
    const { shippingAddress, shippingOptionData } = event.detail.intermediatePaymentData;
    const shippingOptions = await GooglePay.getShippingOptions(shippingAddress);
    const matchedShippingOption = shippingOptions.find(option => option.ID === shippingOptionData?.id);
    const paymentDataUpdate: Partial<Payment.GooglePayButtonOptions> = {};
    if (matchedShippingOption) {
      const { grandTotal } = await GooglePay.selectShippingOption(matchedShippingOption);

      paymentDataUpdate.shippingOptionParameters = {
        defaultSelectedOptionId: matchedShippingOption.ID as string,
        shippingOptions: GooglePay.formatShippingOptions(shippingOptions),
      };
      paymentDataUpdate.amount = grandTotal;
    } else {
      paymentDataUpdate.error = {
        reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
        message: window.i18nResources.cannotShipToAddress,
        intent: 'SHIPPING_OPTION',
      };
    }
    try {
      this.element?.update(paymentDataUpdate);
    } catch (error: unknown) {
      paymentDataUpdate.error = {
        reason: 'OTHER_ERROR',
        message: this.getErrorMessage(error),
        intent: 'SHIPPING_OPTION',
      };
    }
  };

  protected getButtonType() {
    return 'googlePayButton' as const;
  }

  protected getElementOptions(): Payment.ElementOptionsTypeMap['googlePayButton'] {
    return {
      mode: 'payment',
      emailRequired: true,
      billingAddressRequired: true,
      billingAddressParameters: {
        format: 'FULL',
      },
      shippingAddressRequired: true,
      shippingAddressParameters: {
        phoneNumberRequired: true,
        allowedCountryCodes: this.shippingAddressCountryOptions.map(option => option.value),
      },
      shippingOptionRequired: true,
      merchantInfo: {
        merchantName: this.storeName,
      },
      amount: this.originalAmount,
      countryCode: this.countryCode,
      autoCapture: window.airwallexConfig.autoCapture,
      callbackIntents: ['PAYMENT_AUTHORIZATION', 'SHIPPING_ADDRESS', 'SHIPPING_OPTION'],
      allowedCardNetworks: GooglePay.getAllowedCardNetworks(),
    };
  }

  public listenToEvents() {
    this.element?.on('authorized', this.onAuthorized);
    this.element?.on('shippingAddressChange', this.onShippingAddressChange);
    this.element?.on('shippingMethodChange', this.onShippingMethodChange);
  }
}
