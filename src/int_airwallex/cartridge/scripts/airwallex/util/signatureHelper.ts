/**
 * Webhook signature verification helper
 * Airwallex-specific utility for verifying webhook authenticity
 */

import Mac = require('dw/crypto/Mac');
import Encoding = require('dw/crypto/Encoding');
import { getWebhookSecret } from '../../helpers/configHelper';
import logger from '../../helpers/logger';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { Request } from 'express';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

export interface WebhookHeaders {
  signature: string | null;
  timestamp: string | null;
}

const isTimestampValid = (timestamp: string): boolean => {
  const webhookTime = Number(timestamp);
  const diff = Math.abs(Date.now() - webhookTime);
  return diff < MAX_WEBHOOK_AGE_MS;
};

const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const parseWebhookHeaders = (request: Request): WebhookHeaders => {
  const httpHeaders = request.httpHeaders;

  return {
    signature: (httpHeaders.get('x-signature') as string) || null,
    timestamp: (httpHeaders.get('x-timestamp') as string) || null,
  };
};

const computeSignature = (payload: string, secret: string): string => {
  const mac = new Mac(Mac.HMAC_SHA_256);
  const signature = mac.digest(payload, secret);
  return Encoding.toHex(signature);
};

/**
 * Verify webhook signature
 */
const verifySignature = (payload: string, signature: string, timestamp: string): boolean => {
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    logger.error('Webhook secret is not configured');
    return false;
  }

  const signedPayload = `${timestamp}${payload}`;

  const expectedSignature = computeSignature(signedPayload, webhookSecret);

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return constantTimeCompare(signature, expectedSignature);
};

/**
 * Verify a complete webhook request
 */
const verifyWebhook = (payload: string, headers: WebhookHeaders): { valid: boolean; error?: string } => {
  if (!headers.signature) {
    return {
      valid: false,
      error: 'Missing x-signature header',
    };
  }

  if (!headers.timestamp) {
    return {
      valid: false,
      error: 'Missing x-timestamp header',
    };
  }

  if (!isTimestampValid(headers.timestamp)) {
    return {
      valid: false,
      error: 'Webhook timestamp is too old',
    };
  }

  if (!verifySignature(payload, headers.signature, headers.timestamp)) {
    logger.warn('Webhook signature verification failed', {
      error: ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
    });
    return {
      valid: false,
      error: 'Invalid signature',
    };
  }

  return { valid: true };
};

/**
 * Verify webhook from raw request
 */
const verifyWebhookRequest = (request: Request, payload: string): { valid: boolean; error?: string } => {
  const headers = parseWebhookHeaders(request);
  return verifyWebhook(payload, headers);
};

const signatureHelper = {
  verifyWebhookRequest,
};

module.exports = signatureHelper;
export default signatureHelper;
export { verifyWebhookRequest };
