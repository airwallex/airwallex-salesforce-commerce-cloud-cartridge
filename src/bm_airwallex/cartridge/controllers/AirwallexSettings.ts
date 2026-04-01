import server from 'server';

import configHelper from '@/cartridge/scripts/helpers/configHelper';
import merchantConfigClient from '@/cartridge/scripts/airwallex/api/merchantConfig';
import authentication from '@/cartridge/scripts/airwallex/api/authentication';
import type { CustomPreferenceMap } from '@/cartridge/scripts/helpers/configHelper';
import type { Environment } from '@/cartridge/scripts/constants/apiEndpoints';
import type { CardScheme, Logo, PaymentMethodTypeConfig } from '@/cartridge/scripts/airwallex/api/types';

import Transaction = require('dw/system/Transaction');

export interface PaymentMethodResourceInfo {
  displayName: string;
  logoUrl: string;
}

function getLogoFromLogos(logos: Logo | undefined) {
  if (!logos) return '';
  return logos.svg || logos.png || '';
}

function buildResourcesFromPaymentMethods(
  items: PaymentMethodTypeConfig[],
): Record<string, PaymentMethodResourceInfo> {
  const resources: Record<string, PaymentMethodResourceInfo> = {};

  for (const item of items) {
    const displayName = item.display_name || item.name;
    const logoUrl = getLogoFromLogos(item.resources?.logos);
    resources[item.name] = { displayName, logoUrl };
  }

  const cardPaymentMethod = items.find(item => item.name === 'card');
  if (cardPaymentMethod?.card_schemes) {
    for (const scheme of cardPaymentMethod.card_schemes as CardScheme[]) {
      const displayName = scheme.display_name || scheme.name;
      const logoUrl = getLogoFromLogos(scheme.resources?.logos);
      resources[scheme.name] = { displayName, logoUrl };
    }
  }

  return resources;
}

server.get('Start', (req, res, next) => {
  res.render('airwallexSettings/index');
  return next();
});

server.post('Save', server.middleware.https, (req, res, next) => {
  try {
    const reqBody = JSON.parse(req.body) as Partial<CustomPreferenceMap>;
    Object.keys(reqBody).forEach((key: keyof CustomPreferenceMap) => {
      Transaction.wrap(() => {
        configHelper.setCustomPreference(key, reqBody[key] as string | boolean);
      });
    });
    res.json({
      success: true,
    });
  } catch {
    res.json({
      success: false,
    });
  }
  return next();
});

server.post('GetPaymentMethodTypes', server.middleware.https, (req, res, next) => {
  try {
    const { clientId, apiKey, environment } = JSON.parse(req.body) as {
      clientId?: string;
      apiKey?: string;
      environment?: Environment;
    };

    if (!clientId?.trim() || !apiKey?.trim() || !environment?.trim()) {
      res.json({
        success: false,
        message: 'Missing required parameters: environment, clientId, and apiKey are required',
      });
      return next();
    }

    const tokenResponse = authentication.fetchNewToken(environment, clientId, apiKey);
    if (!tokenResponse.success || !tokenResponse.data) {
      res.json({
        success: false,
        message: 'Failed to authenticate',
      });
      return next();
    }

    const result = merchantConfigClient.queryPaymentMethodTypesWithToken({ resources_needed: true }, environment, tokenResponse.data.token);
    if (result.success && result.data) {
      const paymentMethodData = result.data.items;

      const CARD_PAYMENT_METHOD_NAME = 'card';
      const EXPRESS_CHECKOUT_METHODS = ['applepay', 'googlepay'];

      const paymentMethodNames = paymentMethodData
        .map(item => item.name)
        .filter((name, index, arr) => arr.indexOf(name) === index);
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

      const resources = buildResourcesFromPaymentMethods(paymentMethodData);

      res.json({
        success: true,
        cardSchemes,
        expressCheckoutPaymentMethods,
        additionalPaymentMethods,
        resources,
      });
    } else {
      res.json({
        success: false,
        message: result.error?.message ?? 'Failed to fetch payment method types',
      });
    }
  } catch {
    res.json({
      success: false,
      message: 'An unexpected error occurred',
    });
  }
  return next();
});

module.exports = server.exports();
