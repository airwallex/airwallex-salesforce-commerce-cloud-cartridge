// Mock for dw/web/Resource

module.exports = {
  msg: jest.fn((key, bundle, defaultValue) => {
    return key;
  }),
  msgf: jest.fn((key, bundle, defaultValue, ...args) => {
    return key;
  }),
};
