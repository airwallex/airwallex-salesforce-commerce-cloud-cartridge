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
    /** Shared SDK init promise so multiple bundles don't initialise twice. Double-underscore prefix marks internal globals not intended for external use. */
    __awxSdkInitPromise?: Promise<void>;
    /** Reference to the SDK init function that was last used. Used to detect when the CDN script is re-executed and methods are replaced with new closures. */
    __awxInitializedSDKRef?: Function;
    /** Shared priority registry for express checkout surfaces across bundles. Double-underscore prefix marks internal globals not intended for external use. */
    __awxActiveSurfaces?: { priority: number; destroy: () => void }[];
    /** Guarded script loader injected by airwallexMetadata.isml. Appends a <script> tag only when the named global is still undefined. */
    __awxLoadScript?: (globalName: string, src: string, attrs?: Record<string, string>) => void;
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
