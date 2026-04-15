import { AxiosInstance, AxiosStatic } from 'axios';

declare global {
  interface CustomJQuery {
    spinner(): {
      start(): void;
      stop(): void;
    };
  }
  interface Window {
    $: CustomJQuery;
    AirwallexComponentsSDK: typeof import('@airwallex/components-sdk');
    httpClient: AxiosInstance;
    axios: AxiosStatic;
    airwallexBaseUrl: string;
    airwallexConfig: {
      environment: string;
      locale: string;
      autoCapture: boolean;
      paymentMethods: string[];
      cardSchemes: string[];
      applePayEnabled: boolean;
      googlePayEnabled: boolean;
    };
    i18nResources: {
      paymentFailed: string;
      fieldsIncomplete: string;
      unexpectedError: string;
      merchantValidationFailed: string;
      noShippingOptions: string;
      cannotShipWithMethod: string;
      cannotShipToAddress: string;
      exchangeRate: string;
      pay: string;
    };
  }
}
