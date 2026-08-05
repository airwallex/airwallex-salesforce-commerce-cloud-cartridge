describe('configHelper runtime site resolution', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('reads preferences after a site becomes available following module initialization', () => {
    const Site = require('dw/system/Site');
    const mockSite = Site._getMockSite();
    Site.getCurrent.mockReturnValue(null);
    const configHelper = require('../configHelper');

    Site._setPreference('awx_v1_analytics_enabled', true);
    Site.getCurrent.mockReturnValue(mockSite);

    expect(configHelper.isAnalyticsEnabled()).toBe(true);
  });
});

export {};
