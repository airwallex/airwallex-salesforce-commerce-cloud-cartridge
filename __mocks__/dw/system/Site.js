// Mock for dw/system/Site
let preferences = {};

const mockSite = {
  getCustomPreferenceValue: jest.fn(key => preferences[key]),
  setCustomPreferenceValue: jest.fn((key, value) => {
    preferences[key] = value;
  }),
  getID: jest.fn(() => hostConfig.ID),
  getName: jest.fn(() => 'Test Site'),
  get ID() {
    return hostConfig.ID;
  },
  get httpsHostName() {
    return hostConfig.httpsHostName;
  },
  get httpHostName() {
    return hostConfig.httpHostName;
  },
};

const hostConfig = {
  ID: 'TestSite',
  httpsHostName: undefined,
  httpHostName: undefined,
};

module.exports = {
  getCurrent: jest.fn(() => mockSite),
  // Test helpers
  _reset: () => {
    preferences = {};
    hostConfig.ID = 'TestSite';
    hostConfig.httpsHostName = undefined;
    hostConfig.httpHostName = undefined;
    jest.clearAllMocks();
  },
  _getPreferences: () => preferences,
  _setPreference: (key, value) => {
    preferences[key] = value;
  },
  _setHostConfig: config => {
    Object.assign(hostConfig, config);
  },
  _getMockSite: () => mockSite,
};
