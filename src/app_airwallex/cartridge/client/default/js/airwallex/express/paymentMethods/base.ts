import type { Payment } from '@airwallex/components-sdk';
import type { FormFieldOptionPlain } from 'server';

import type { Amount } from '../../../types';

type ButtonTypeToElementType = {
  googlePayButton: Payment.GooglePayButtonElementType;
  applePayButton: Payment.ApplePayButtonElementType;
};

type ButtonType = keyof ButtonTypeToElementType;

export interface ExpressCheckoutProps {
  amount: Amount;
  countryCode: string;
  storeName: string;
  shippingAddressCountryOptions: FormFieldOptionPlain[];
}

export abstract class ExpressCheckout<TButtonType extends ButtonType = ButtonType> {
  public originalAmount: Amount;
  public countryCode: string;
  public storeName: string;
  public shippingAddressCountryOptions: FormFieldOptionPlain[];
  public container: HTMLDivElement;
  public element: ButtonTypeToElementType[TButtonType] | null | undefined;

  constructor(props: ExpressCheckoutProps) {
    this.originalAmount = props.amount;
    this.countryCode = props.countryCode;
    this.storeName = props.storeName;
    this.shippingAddressCountryOptions = props.shippingAddressCountryOptions;
  }

  protected abstract getButtonType(): TButtonType;

  protected abstract getElementOptions(): Payment.ElementOptionsTypeMap[TButtonType];

  protected abstract listenToEvents(): void;

  protected getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return window.i18nResources.unexpectedError;
  }

  public async createElement(container: HTMLDivElement): Promise<ButtonTypeToElementType[TButtonType]> {
    const buttonType = this.getButtonType();
    const elementOptions = this.getElementOptions();
    const element = (await window.AirwallexComponentsSDK.createElement(
      buttonType,
      elementOptions,
    )) as ButtonTypeToElementType[TButtonType];
    this.element = element;
    this.container = container;
    return element;
  }

  public mount() {
    return this.element?.mount(this.container);
  }
}
