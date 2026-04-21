import type { Payment, ElementOptionsTypes } from '@airwallex/components-sdk';
import type { FormFieldOptionPlain } from 'server';

import type {
  Amount,
  CreateTemporaryBasketResponse,
  ShippingOptionsResponse,
  SelectShippingMethodResponse,
  ExpressCheckoutAuthorizationResponse,
} from '../../../types';
import type { AvailableShippingOption } from '@/cartridge/scripts/airwallex/payments/shippingOptions';
import type { ExpressCheckoutAddress } from '@/cartridge/scripts/airwallex/payments/expressCheckoutAuthorization';

type ButtonTypeToElementType = {
  googlePayButton: Payment.GooglePayButtonElementType;
  applePayButton: Payment.ApplePayButtonElementType;
};

type ButtonType = keyof ButtonTypeToElementType;

export interface ProductData {
  pid: string;
  quantity: number;
  options?: string;
  childProducts?: string;
}

export interface ShippingAddressInput {
  locality?: string;
  countryCode?: string;
  administrativeArea?: string;
  postalCode?: string;
}

export interface ExpressCheckoutProps {
  amount: Amount;
  countryCode: string;
  storeName: string;
  shippingAddressCountryOptions: FormFieldOptionPlain[];
  isExpressProduct?: boolean;
  productData?: ProductData;
}

export abstract class ExpressCheckout<TButtonType extends ButtonType = ButtonType> {
  public originalAmount: Amount;
  public countryCode: string;
  public storeName: string;
  public shippingAddressCountryOptions: FormFieldOptionPlain[];
  public container: HTMLDivElement;
  public element: ButtonTypeToElementType[TButtonType] | null | undefined;
  public isExpressProduct: boolean;
  public productData?: ProductData;
  private tempBasketCreated = false;

  constructor(props: ExpressCheckoutProps) {
    this.originalAmount = props.amount;
    this.countryCode = props.countryCode;
    this.storeName = props.storeName;
    this.shippingAddressCountryOptions = props.shippingAddressCountryOptions;
    this.isExpressProduct = props.isExpressProduct ?? false;
    this.productData = props.productData;
  }

  protected abstract getButtonType(): TButtonType;

  protected abstract getElementOptions(): ElementOptionsTypes[TButtonType];

  protected abstract listenToEvents(): void;

  protected getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return window.i18nResources.unexpectedError;
  }

  protected async ensureTemporaryBasket(): Promise<CreateTemporaryBasketResponse> {
    if (this.tempBasketCreated) {
      return { temporaryBasketCreated: true, amount: this.originalAmount };
    }
    if (!this.productData) {
      throw new Error('Product data is required for PDP express checkout');
    }
    const data: Record<string, string> = {
      pid: this.productData.pid,
      quantity: String(this.productData.quantity),
    };
    if (this.productData.options) {
      data.options = this.productData.options;
    }
    if (this.productData.childProducts) {
      data.childProducts = this.productData.childProducts;
    }
    const res = await window.httpClient.post<CreateTemporaryBasketResponse>('Airwallex-CreateTemporaryBasket', data);
    this.tempBasketCreated = true;
    return res.data;
  }

  protected async post<T>(url: string, data: Record<string, string | undefined>): Promise<T> {
    if (this.isExpressProduct) {
      data.isExpressProduct = 'true';
    }
    const res = await window.httpClient.post<T>(url, data);
    return res.data;
  }

  protected async getShippingOptions(address?: ShippingAddressInput) {
    const res = await this.post<ShippingOptionsResponse>('Airwallex-ShippingOptions', {
      city: address?.locality,
      countryCode: address?.countryCode,
      stateCode: address?.administrativeArea,
      postalCode: address?.postalCode,
    });
    return res.shippingMethods;
  }

  protected async selectShippingOption(shippingOption: AvailableShippingOption) {
    return this.post<SelectShippingMethodResponse>('Airwallex-SelectShippingMethod', {
      shipmentUUID: shippingOption.shipmentUUID || undefined,
      shippingMethodID: shippingOption.ID || undefined,
    });
  }

  protected async authorizePayment(
    billingAddress: ExpressCheckoutAddress,
    shippingAddress: ExpressCheckoutAddress,
    email: string,
  ) {
    return this.post<ExpressCheckoutAuthorizationResponse>('Airwallex-ExpressCheckoutAuthorization', {
      billingAddress: JSON.stringify(billingAddress),
      shippingAddress: JSON.stringify(shippingAddress),
      email,
    });
  }

  protected async confirmAndRedirect(clientSecret: string, redirectUrl?: string) {
    const intent = await this.element!.confirmIntent({
      client_secret: clientSecret,
    });
    if (intent && redirectUrl) {
      window.location.href = redirectUrl;
    }
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
