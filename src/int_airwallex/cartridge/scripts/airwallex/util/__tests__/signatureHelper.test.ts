/**
 * Unit tests for signatureHelper module
 */

jest.mock('../../../helpers/configHelper', () => ({
  getWebhookSecret: jest.fn(),
}));

jest.mock('../../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { getWebhookSecret } from '../../../helpers/configHelper';
import logger from '../../../helpers/logger';

const mockGetWebhookSecret = getWebhookSecret as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

const signatureHelper = require('../signatureHelper');
const { verifyWebhookRequest } = signatureHelper;

const crypto = require('crypto');

const WEBHOOK_SECRET = 'test-webhook-secret-key';

const computeExpectedSignature = (payload: string, timestamp: string, secret: string): string => {
  const signedPayload = `${timestamp}${payload}`;
  return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
};

const createMockRequest = (signature: string | null, timestamp: string | null) => ({
  httpHeaders: {
    get: (name: string) => {
      if (name === 'x-signature') return signature;
      if (name === 'x-timestamp') return timestamp;
      return null;
    },
  },
});

describe('signatureHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebhookSecret.mockReturnValue(WEBHOOK_SECRET);
  });

  describe('verifyWebhookRequest', () => {
    describe('valid webhooks', () => {
      it('returns valid for correctly signed webhook', () => {
        const payload = '{"id":"evt_123","name":"payment_intent.succeeded"}';
        const timestamp = String(Date.now());
        const signature = computeExpectedSignature(payload, timestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({ valid: true });
      });

      it('accepts webhook at the edge of the 5-minute window', () => {
        const payload = '{"event":"test"}';
        const almostExpiredTimestamp = String(Date.now() - 4 * 60 * 1000);
        const signature = computeExpectedSignature(payload, almostExpiredTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, almostExpiredTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({ valid: true });
      });
    });

    describe('missing headers', () => {
      it('returns error when x-signature header is missing', () => {
        const request = createMockRequest(null, '1234567890');

        const result = verifyWebhookRequest(request, '{}');

        expect(result).toEqual({
          valid: false,
          error: 'Missing x-signature header',
        });
      });

      it('returns error when x-timestamp header is missing', () => {
        const request = createMockRequest('some-signature', null);

        const result = verifyWebhookRequest(request, '{}');

        expect(result).toEqual({
          valid: false,
          error: 'Missing x-timestamp header',
        });
      });

      it('returns error when both headers are missing', () => {
        const request = createMockRequest(null, null);

        const result = verifyWebhookRequest(request, '{}');

        expect(result).toEqual({
          valid: false,
          error: 'Missing x-signature header',
        });
      });
    });

    describe('timestamp validation', () => {
      it('rejects webhook with timestamp older than 5 minutes', () => {
        const payload = '{"event":"test"}';
        const oldTimestamp = String(Date.now() - 6 * 60 * 1000);
        const signature = computeExpectedSignature(payload, oldTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, oldTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Webhook timestamp is too old',
        });
      });

      it('rejects webhook with very old timestamp', () => {
        const payload = '{"event":"test"}';
        const veryOldTimestamp = String(Date.now() - 60 * 60 * 1000);
        const signature = computeExpectedSignature(payload, veryOldTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, veryOldTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Webhook timestamp is too old',
        });
      });

      it('rejects webhook with timestamp more than 5 minutes in the future', () => {
        const payload = '{"event":"test"}';
        const futureTimestamp = String(Date.now() + 6 * 60 * 1000);
        const signature = computeExpectedSignature(payload, futureTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, futureTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Webhook timestamp is too old',
        });
      });

      it('accepts webhook with timestamp slightly in the future (within 5 minutes)', () => {
        const payload = '{"event":"test"}';
        const nearFutureTimestamp = String(Date.now() + 2 * 60 * 1000);
        const signature = computeExpectedSignature(payload, nearFutureTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, nearFutureTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({ valid: true });
      });

      it('accepts webhook with current timestamp', () => {
        const payload = '{"event":"test"}';
        const nowTimestamp = String(Date.now());
        const signature = computeExpectedSignature(payload, nowTimestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, nowTimestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({ valid: true });
      });
    });

    describe('signature verification', () => {
      it('rejects webhook with incorrect signature', () => {
        const payload = '{"id":"evt_123"}';
        const timestamp = String(Date.now());
        const request = createMockRequest('invalid-signature-value-with-correct-length-padding-here', timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Webhook signature verification failed',
          expect.objectContaining({ error: 'WEBHOOK_SIGNATURE_INVALID' }),
        );
      });

      it('rejects webhook when signature length differs from expected', () => {
        const payload = '{"id":"evt_123"}';
        const timestamp = String(Date.now());
        const request = createMockRequest('short', timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
      });

      it('rejects webhook signed with wrong secret', () => {
        const payload = '{"id":"evt_123"}';
        const timestamp = String(Date.now());
        const wrongSignature = computeExpectedSignature(payload, timestamp, 'wrong-secret');
        const request = createMockRequest(wrongSignature, timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
      });

      it('rejects webhook with tampered payload', () => {
        const originalPayload = '{"id":"evt_123","amount":1000}';
        const timestamp = String(Date.now());
        const signature = computeExpectedSignature(originalPayload, timestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, timestamp);

        const tamperedPayload = '{"id":"evt_123","amount":9999}';
        const result = verifyWebhookRequest(request, tamperedPayload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
      });
    });

    describe('webhook secret configuration', () => {
      it('returns invalid when webhook secret is not configured', () => {
        mockGetWebhookSecret.mockReturnValue(null);
        const payload = '{"event":"test"}';
        const timestamp = String(Date.now());
        const request = createMockRequest(
          'some-signature-value-here-padded-to-64-chars-for-hex-digest-len!',
          timestamp,
        );

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Webhook secret is not configured');
      });

      it('returns invalid when webhook secret is empty string', () => {
        mockGetWebhookSecret.mockReturnValue('');
        const payload = '{"event":"test"}';
        const timestamp = String(Date.now());
        const request = createMockRequest('some-signature', timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result).toEqual({
          valid: false,
          error: 'Invalid signature',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Webhook secret is not configured');
      });
    });

    describe('constant-time comparison', () => {
      it('correctly validates matching signatures of same length', () => {
        const payload = '{"test":true}';
        const timestamp = String(Date.now());
        const signature = computeExpectedSignature(payload, timestamp, WEBHOOK_SECRET);
        const request = createMockRequest(signature, timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result.valid).toBe(true);
      });

      it('rejects signatures that differ by a single character', () => {
        const payload = '{"test":true}';
        const timestamp = String(Date.now());
        const correctSignature = computeExpectedSignature(payload, timestamp, WEBHOOK_SECRET);
        const lastChar = correctSignature[correctSignature.length - 1];
        const alteredChar = lastChar === 'a' ? 'b' : 'a';
        const alteredSignature = correctSignature.slice(0, -1) + alteredChar;
        const request = createMockRequest(alteredSignature, timestamp);

        const result = verifyWebhookRequest(request, payload);

        expect(result.valid).toBe(false);
      });
    });
  });
});
