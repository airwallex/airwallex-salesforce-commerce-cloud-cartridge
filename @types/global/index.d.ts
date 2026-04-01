import { Payment } from '@airwallex/components-sdk';
import { AxiosInstance } from 'axios';

declare global {
  interface CustomJQuery {
    spinner(): {
      start(): void;
      stop(): void;
    };
  }
  interface Window {
    $: CustomJQuery;
    AirwallexComponentsSDK: Payment.Airwallex;
    httpClient: AxiosInstance;
    airwallexConfig: {
      environment: string;
      autoCapture: boolean;
      paymentMethods: string[];
      cardSchemes: string[];
      applePayEnabled: boolean;
      googlePayEnabled: boolean;
    };
  }
}
