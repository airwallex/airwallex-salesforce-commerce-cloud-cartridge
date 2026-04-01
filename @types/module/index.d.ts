/**
 * Module declarations for scripts from storefront-reference-architecture
 */

declare module '*/cartridge/scripts/checkout/checkoutHelpers' {
  import type Order from 'dw/order/Order';
  import type Basket from 'dw/order/Basket';

  const handlePayments: (order: Order, orderNumber: string) => { error: boolean };
  const calculatePaymentTransaction: (basket: Basket) => { error: boolean };

  export { handlePayments, calculatePaymentTransaction };
}

declare module '*/cartridge/scripts/helpers/basketValidationHelpers' {
  import type Basket from 'dw/order/Basket';

  const validateProducts: (basket: Basket) => { error: boolean };

  export { validateProducts };
}

declare module '*/cartridge/scripts/helpers/hooks' {
  function hooksHelper(hookName: string, hookFunction: string, ...args: any[]): any;
  export = hooksHelper;
}

declare module '*/cartridge/scripts/hooks/validateOrder' {
  import type Basket from 'dw/order/Basket';

  const validateOrder: (basket: Basket) => { error: boolean; message?: string };

  export { validateOrder };
}

declare module '*/cartridge/scripts/hooks/fraudDetection' {
  const fraudDetection: (orderOrBasket: any) => { status: string; errorCode?: string };

  export { fraudDetection };
}

declare module '*/cartridge/scripts/middleware/csrf' {
  import type { Request, Response, NextFunction } from 'express';

  const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
  const validateAjaxRequest: (req: Request, res: Response, next: NextFunction) => void;
  const generateToken: (req: Request, res: Response, next: NextFunction) => void;

  export { validateRequest, validateAjaxRequest, generateToken };
}

declare module '*/cartridge/models/shipping/shippingMethod' {
  import type ShippingMethod from 'dw/order/ShippingMethod';
  import type Shipment from 'dw/order/Shipment';

  /**
   * Plain JS object representing a dw.order.ShippingMethod for view/API consumption.
   * Based on SFRA app_storefront_base/cartridge/models/shipping/shippingMethod.js
   */
  export interface ShippingMethodModelInstance {
    ID: string | null;
    displayName: string | null;
    description: string | null;
    estimatedArrivalTime: string | null;
    default: boolean | null;
    /** Formatted currency string; present when constructed with shipment */
    shippingCost?: string;
    /** Whether this method is selected; present when constructed with shipment */
    selected?: boolean;
  }

  interface ShippingMethodModelConstructor {
    new (shippingMethod: ShippingMethod, shipment?: Shipment): ShippingMethodModelInstance;
    (shippingMethod: ShippingMethod, shipment?: Shipment): ShippingMethodModelInstance;
  }

  const ShippingMethodModel: ShippingMethodModelConstructor;
  export default ShippingMethodModel;
}

declare module '*/cartridge/models/cart' {
  import type Basket from 'dw/order/Basket';

  /**
   * Cart action URLs object from SFRA cart model.
   * Based on SFRA app_storefront_base/cartridge/models/cart.js
   */
  export interface CartActionUrls {
    removeProductLineItemUrl: string;
    updateQuantityUrl: string;
    selectShippingUrl: string;
    submitCouponCodeUrl: string;
    removeCouponLineItem: string;
  }

  /**
   * Cart totals sub-model instance.
   * Based on SFRA app_storefront_base/cartridge/models/totals.js
   */
  export interface TotalsModelInstance {
    subTotal: string;
    totalShippingCost: string;
    grandTotal: string;
    totalTax: string;
    orderLevelDiscountTotal: { value: number; formatted: string } | string;
    shippingLevelDiscountTotal: { value: number; formatted: string } | string;
    discounts: unknown[];
    discountsHtml?: string;
  }

  /**
   * Shipment entry in cart shipments array.
   * Based on SFRA app_storefront_base/cartridge/models/cart.js
   */
  export interface CartShipmentEntry {
    shippingMethods?: import('*/cartridge/models/shipping/shippingMethod').ShippingMethodModelInstance[] | null;
    selectedShippingMethod?: string | null;
  }

  /**
   * Cart resources object.
   * Based on SFRA app_storefront_base/cartridge/models/cart.js
   */
  export interface CartResources {
    numberOfItems: string;
    minicartCountOfItems: string;
    emptyCartMsg: string;
  }

  /**
   * Approaching discount object from promotion.
   * Based on SFRA app_storefront_base/cartridge/models/cart.js
   */
  export interface ApproachingDiscount {
    discountMsg: string;
  }

  /**
   * CartModel instance representing the current basket for view/API consumption.
   * Based on SFRA app_storefront_base/cartridge/models/cart.js
   */
  export interface CartModelInstance {
    hasBonusProduct: boolean;
    actionUrls: CartActionUrls;
    numOfShipments: number;
    totals: TotalsModelInstance;
    shipments: CartShipmentEntry[];
    approachingDiscounts: ApproachingDiscount[];
    items: unknown[];
    numItems: number;
    valid: boolean;
    resources: CartResources;
  }

  interface CartModelConstructor {
    new (basket: Basket | null): CartModelInstance;
    (basket: Basket | null): CartModelInstance;
  }

  const CartModel: CartModelConstructor;
  export default CartModel;
}

declare module '*/cartridge/scripts/checkout/shippingHelpers' {
  import type Basket from 'dw/order/Basket';
  import type Shipment from 'dw/order/Shipment';
  import type ShippingMethod from 'dw/order/ShippingMethod';
  import type { ShippingMethodModelInstance } from '*/cartridge/models/shipping/shippingMethod';

  /** Raw address form data from request.form */
  export interface AddressFormData {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    stateCode?: string;
    postalCode?: string;
    countryCode?: string;
    phone?: string;
  }

  /** Shipping model instance from cartridge/models/shipping (plain object for view and API consumption) */
  export interface ShippingModelInstance {
    UUID: string | null;
    productLineItems: unknown;
    applicableShippingMethods: ShippingMethodModelInstance[] | null;
    selectedShippingMethod: ShippingMethodModelInstance | null;
    matchingAddressId: string | false;
    shippingAddress: AddressFormData | null;
    isGift: boolean | null;
    giftMessage: string | null;
  }

  /**
   * Get an array of ShippingModels for the basket's shipments.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function getShippingModels(
    currentBasket: Basket | null,
    customer: unknown,
    containerView: string,
  ): ShippingModelInstance[];

  /**
   * Retrieve raw address JSON object from request.form.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function getAddressFromRequest(req: { form: Record<string, unknown> }): AddressFormData;

  /**
   * Sets the shipping method of the basket's shipment.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function selectShippingMethod(
    shipment: Shipment,
    shippingMethodID: string,
    shippingMethods?: dw.util.Collection<ShippingMethod> | null,
    address?: AddressFormData | null,
  ): void;

  /**
   * Sets the default ShippingMethod for a Shipment, if absent.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function ensureShipmentHasMethod(shipment: Shipment): void;

  /**
   * Get a Shipment by UUID from the basket.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function getShipmentByUUID(basket: Basket, uuid: string): Shipment | null;

  /**
   * Get applicable shipping methods for a shipment (excludes store pickup).
   * Returns array of ShippingMethodModel instances.
   * Based on SFRA app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
   */
  function getApplicableShippingMethods(
    shipment: Shipment | null,
    address?: AddressFormData | null,
  ): ShippingMethodModelInstance[] | null;

  export {
    getShippingModels,
    getAddressFromRequest,
    selectShippingMethod,
    ensureShipmentHasMethod,
    getShipmentByUUID,
    getApplicableShippingMethods,
  };

  /** Default export for CommonJS interop: module.exports = { getShippingModels, ... } */
  const shippingHelpers: {
    getShippingModels: typeof getShippingModels;
    getAddressFromRequest: typeof getAddressFromRequest;
    selectShippingMethod: typeof selectShippingMethod;
    ensureShipmentHasMethod: typeof ensureShipmentHasMethod;
    getShipmentByUUID: typeof getShipmentByUUID;
    getApplicableShippingMethods: typeof getApplicableShippingMethods;
  };
  export default shippingHelpers;
}

declare module '*/cartridge/scripts/helpers/basketCalculationHelpers' {
  import type Basket from 'dw/order/Basket';

  /**
   * Calculate sales taxes.
   * Based on SFRA app_storefront_base/cartridge/scripts/helpers/basketCalculationHelpers.js
   */
  function calculateTaxes(basket: Basket): object;

  /**
   * Calculate all totals as well as shipping and taxes.
   * Based on SFRA app_storefront_base/cartridge/scripts/helpers/basketCalculationHelpers.js
   */
  function calculateTotals(basket: Basket): void;

  export { calculateTaxes, calculateTotals };

  /** Default export for CommonJS interop: module.exports = { calculateTaxes, calculateTotals } */
  const basketCalculationHelpers: {
    calculateTaxes: typeof calculateTaxes;
    calculateTotals: typeof calculateTotals;
  };
  export default basketCalculationHelpers;
}
