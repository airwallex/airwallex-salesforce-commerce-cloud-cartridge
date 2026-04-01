/**
 * Unit tests for configHelper module
 */

const Site = require('dw/system/Site');

// Need to require configHelper after Site mock is set up
const configHelper = require('../configHelper');

const {
  getEnvironment,
  setEnvironment,
  getClientId,
  getApiKey,
  getWebhookSecret,
  setClientId,
  setApiKey,
  setWebhookSecret,
  isEnabled,
  getWebhookUrl,
} = configHelper;

describe('configHelper', () => {
  beforeEach(() => {
    Site._reset();
  });

  describe('getEnvironment', () => {
    it('returns undefined when environment is not set', () => {
      expect(getEnvironment()).toBeUndefined();
    });

    it('returns the environment when set', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(getEnvironment()).toBe('demo');
    });

    it('returns production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');

      expect(getEnvironment()).toBe('production');
    });

    it('returns demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(getEnvironment()).toBe('demo');
    });
  });

  describe('setEnvironment', () => {
    it('sets the environment to production', () => {
      setEnvironment('production');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith('awx_v1_environment', 'production');
    });

    it('sets the environment to demo', () => {
      setEnvironment('demo');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith('awx_v1_environment', 'demo');
    });
  });

  describe('getClientId', () => {
    it('returns undefined when environment is not set', () => {
      expect(getClientId()).toBeUndefined();
    });

    it('returns undefined when clientId is not set for environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(getClientId()).toBeUndefined();
    });

    it('returns clientId for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');
      Site._setPreference('awx_v1_client_id_production', 'production-client-id');

      expect(getClientId()).toBe('production-client-id');
    });

    it('returns clientId for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');
      Site._setPreference('awx_v1_client_id_demo', 'demo-client-id');

      expect(getClientId()).toBe('demo-client-id');
    });
  });

  describe('setClientId', () => {
    it('does nothing when environment is not set', () => {
      setClientId('test-client-id');

      // setCustomPreferenceValue should not be called for client_id
      // (it may be called for other purposes, so we check the preferences)
      expect(Site._getPreferences()['awx_v1_client_id_production']).toBeUndefined();
      expect(Site._getPreferences()['awx_v1_client_id_demo']).toBeUndefined();
    });

    it('sets clientId for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');

      setClientId('new-production-client-id');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith(
        'awx_v1_client_id_production',
        'new-production-client-id',
      );
    });

    it('sets clientId for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      setClientId('new-demo-client-id');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith('awx_v1_client_id_demo', 'new-demo-client-id');
    });
  });

  describe('getApiKey', () => {
    it('returns undefined when environment is not set', () => {
      expect(getApiKey()).toBeUndefined();
    });

    it('returns undefined when apiKey is not set for environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(getApiKey()).toBeUndefined();
    });

    it('returns apiKey for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');
      Site._setPreference('awx_v1_api_key_production', 'production-api-key');

      expect(getApiKey()).toBe('production-api-key');
    });

    it('returns apiKey for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');
      Site._setPreference('awx_v1_api_key_demo', 'demo-api-key');

      expect(getApiKey()).toBe('demo-api-key');
    });
  });

  describe('setApiKey', () => {
    it('does nothing when environment is not set', () => {
      setApiKey('test-api-key');

      expect(Site._getPreferences()['awx_v1_api_key_production']).toBeUndefined();
      expect(Site._getPreferences()['awx_v1_api_key_demo']).toBeUndefined();
    });

    it('sets apiKey for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');

      setApiKey('new-production-api-key');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith(
        'awx_v1_api_key_production',
        'new-production-api-key',
      );
    });

    it('sets apiKey for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      setApiKey('new-demo-api-key');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith('awx_v1_api_key_demo', 'new-demo-api-key');
    });
  });

  describe('getWebhookSecret', () => {
    it('returns undefined when environment is not set', () => {
      expect(getWebhookSecret()).toBeUndefined();
    });

    it('returns undefined when webhookSecret is not set for environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(getWebhookSecret()).toBeUndefined();
    });

    it('returns webhookSecret for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');
      Site._setPreference('awx_v1_webhook_secret_production', 'production-webhook-secret');

      expect(getWebhookSecret()).toBe('production-webhook-secret');
    });

    it('returns webhookSecret for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');
      Site._setPreference('awx_v1_webhook_secret_demo', 'demo-webhook-secret');

      expect(getWebhookSecret()).toBe('demo-webhook-secret');
    });
  });

  describe('setWebhookSecret', () => {
    it('does nothing when environment is not set', () => {
      setWebhookSecret('test-webhook-secret');

      expect(Site._getPreferences()['awx_v1_webhook_secret_production']).toBeUndefined();
      expect(Site._getPreferences()['awx_v1_webhook_secret_demo']).toBeUndefined();
    });

    it('sets webhookSecret for production environment', () => {
      Site._setPreference('awx_v1_environment', 'production');

      setWebhookSecret('new-production-webhook-secret');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith(
        'awx_v1_webhook_secret_production',
        'new-production-webhook-secret',
      );
    });

    it('sets webhookSecret for demo environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      setWebhookSecret('new-demo-webhook-secret');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith(
        'awx_v1_webhook_secret_demo',
        'new-demo-webhook-secret',
      );
    });
  });

  describe('isEnabled', () => {
    it('returns false when environment is not set', () => {
      expect(isEnabled()).toBe(false);
    });

    it('returns true when environment is set to production', () => {
      Site._setPreference('awx_v1_environment', 'production');

      expect(isEnabled()).toBe(true);
    });

    it('returns true when environment is set to demo', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(isEnabled()).toBe(true);
    });
  });

  describe('getCustomPreference', () => {
    it('returns custom preference value', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      const result = configHelper.getCustomPreference('awx_v1_environment');

      expect(result).toBe('demo');
    });

    it('returns undefined for non-existent preference', () => {
      const result = configHelper.getCustomPreference('awx_v1_environment');

      expect(result).toBeUndefined();
    });
  });

  describe('setCustomPreference', () => {
    it('sets custom preference value', () => {
      configHelper.setCustomPreference('awx_v1_environment', 'production');

      const mockSite = Site._getMockSite();
      expect(mockSite.setCustomPreferenceValue).toHaveBeenCalledWith('awx_v1_environment', 'production');
    });
  });

  describe('getAutoCapture', () => {
    it('returns "true" by default when environment is not set', () => {
      expect(configHelper.getAutoCapture()).toBe(true);
    });

    it('returns "true" by default when env-specific value is not set', () => {
      Site._setPreference('awx_v1_environment', 'demo');

      expect(configHelper.getAutoCapture()).toBe(true);
    });

    it('returns the value when set for current environment', () => {
      Site._setPreference('awx_v1_environment', 'demo');
      Site._setPreference('awx_v1_auto_capture_demo', false);

      expect(configHelper.getAutoCapture()).toBe(false);
    });

    it('returns env-specific value when passed explicitly', () => {
      Site._setPreference('awx_v1_auto_capture_demo', true);
      Site._setPreference('awx_v1_auto_capture_production', false);

      expect(configHelper.getAutoCapture('demo')).toBe(true);
      expect(configHelper.getAutoCapture('production')).toBe(false);
    });
  });

  describe('getWebhookUrl', () => {
    it('returns storefront URL when site has httpsHostName configured', () => {
      Site._setHostConfig({ httpsHostName: 'www.mystore.com', ID: 'MySite' });

      const result = getWebhookUrl();

      expect(result).toBe(
        'https://www.mystore.com/on/demandware.store/Sites-MySite-Site/default/AirwallexWebhook-Notify',
      );
    });

    it('returns storefront URL when site has only httpHostName configured', () => {
      Site._setHostConfig({ httpsHostName: undefined, httpHostName: 'www.mystore.com', ID: 'MySite' });

      const result = getWebhookUrl();

      expect(result).toBe(
        'https://www.mystore.com/on/demandware.store/Sites-MySite-Site/default/AirwallexWebhook-Notify',
      );
    });

    it('falls back to URLUtils.https when no host is configured', () => {
      Site._setHostConfig({ httpsHostName: undefined, httpHostName: undefined });

      const result = getWebhookUrl();

      expect(result).toContain('AirwallexWebhook-Notify');
      expect(result).toMatch(/^https:\/\//);
    });
  });

  describe('environment-specific credential isolation', () => {
    it('returns correct credentials when switching environments', () => {
      Site._setPreference('awx_v1_client_id_demo', 'demo-client');
      Site._setPreference('awx_v1_api_key_demo', 'demo-key');
      Site._setPreference('awx_v1_webhook_secret_demo', 'demo-secret');
      Site._setPreference('awx_v1_client_id_production', 'prod-client');
      Site._setPreference('awx_v1_api_key_production', 'prod-key');
      Site._setPreference('awx_v1_webhook_secret_production', 'prod-secret');

      Site._setPreference('awx_v1_environment', 'demo');
      expect(getClientId()).toBe('demo-client');
      expect(getApiKey()).toBe('demo-key');
      expect(getWebhookSecret()).toBe('demo-secret');

      Site._setPreference('awx_v1_environment', 'production');
      expect(getClientId()).toBe('prod-client');
      expect(getApiKey()).toBe('prod-key');
      expect(getWebhookSecret()).toBe('prod-secret');
    });
  });
});
