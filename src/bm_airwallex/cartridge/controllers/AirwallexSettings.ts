import configHelper from '@/cartridge/scripts/helpers/configHelper';
import merchantConfigClient from '@/cartridge/scripts/airwallex/api/merchantConfig';
import authentication from '@/cartridge/scripts/airwallex/api/authentication';
import airwallexSettingsHelper from '@/cartridge/scripts/helpers/airwallexSettings';
import bmControllerHelper from '@/cartridge/scripts/helpers/bmController';
import { setBufferedLoggingContext } from '@/cartridge/scripts/helpers/airTracker';
import type { Environment } from '@/cartridge/scripts/constants/apiEndpoints';
export type { PaymentMethodResourceInfo } from '@/cartridge/scripts/helpers/airwallexSettings';

import ISML = require('dw/template/ISML');
import Transaction = require('dw/system/Transaction');

const { CARD_PAYMENT_METHOD_NAME, EXPRESS_CHECKOUT_METHODS, buildResourcesFromPaymentMethods, parsePreferenceUpdates } =
  airwallexSettingsHelper;
const { sendJson, isGet, isSecurePost, makePublic, getCsrfTokenData } = bmControllerHelper;

const Start = makePublic(() => {
  if (!isGet()) {
    return;
  }

  ISML.renderTemplate('airwallexSettings/index', getCsrfTokenData());
});

const Save = makePublic(() => {
  if (!isSecurePost()) {
    return;
  }

  try {
    const preferenceUpdates = parsePreferenceUpdates(request.httpParameterMap.requestBodyAsString);
    Transaction.wrap(() => {
      preferenceUpdates.forEach(({ key, value }) => {
        configHelper.setCustomPreference(key, value);
      });
    });
    sendJson({ success: true });
  } catch {
    sendJson({ success: false });
  }
});

const GetPaymentMethodTypes = makePublic(() => {
  if (!isSecurePost()) {
    return;
  }

  try {
    const { clientId, apiKey, environment } = JSON.parse(request.httpParameterMap.requestBodyAsString) as {
      clientId?: string;
      apiKey?: string;
      environment?: Environment;
    };

    if (!clientId?.trim() || !apiKey?.trim() || !environment?.trim()) {
      sendJson({
        success: false,
        message: 'Missing required parameters: environment, clientId, and apiKey are required',
      });
      return;
    }

    const tokenResponse = authentication.fetchNewToken(environment, clientId, apiKey);
    if (!tokenResponse.success || !tokenResponse.data) {
      sendJson({
        success: false,
        message: 'Failed to authenticate',
      });
      return;
    }

    setBufferedLoggingContext(environment, tokenResponse.data.token);
    const result = merchantConfigClient.queryPaymentMethodTypesWithToken(
      { resources_needed: true },
      environment,
      tokenResponse.data.token,
    );
    if (!result.success || !result.data) {
      sendJson({
        success: false,
        message: result.error?.message ?? 'Failed to fetch payment method types',
      });
      return;
    }

    const paymentMethodData = result.data.items;
    const paymentMethodNames = paymentMethodData
      .map(item => item.name)
      .filter((name, index, items) => items.indexOf(name) === index);
    const expressCheckoutPaymentMethods = paymentMethodNames.filter(name =>
      EXPRESS_CHECKOUT_METHODS.includes(name.toLowerCase()),
    );
    const additionalPaymentMethods = paymentMethodNames.filter(
      name =>
        !EXPRESS_CHECKOUT_METHODS.includes(name.toLowerCase()) && name.toLowerCase() !== CARD_PAYMENT_METHOD_NAME,
    );
    const cardSchemes =
      paymentMethodData
        .find(item => item.name === CARD_PAYMENT_METHOD_NAME)
        ?.card_schemes?.map(scheme => scheme.name) ?? [];

    sendJson({
      success: true,
      cardSchemes,
      expressCheckoutPaymentMethods,
      additionalPaymentMethods,
      resources: buildResourcesFromPaymentMethods(paymentMethodData),
    });
  } catch {
    sendJson({
      success: false,
      message: 'An unexpected error occurred',
    });
  }
});

module.exports = {
  Start,
  Save,
  GetPaymentMethodTypes,
};
