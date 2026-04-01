// Mock for dw/web/URLUtils
module.exports = {
  https: jest.fn(action => ({
    toString: () => `https://mock-host/on/demandware.store/Sites-MockSite-Site/default/${action}`,
  })),
  url: jest.fn(action => ({
    toString: () => `/on/demandware.store/Sites-MockSite-Site/default/${action}`,
  })),
  abs: jest.fn(action => ({
    toString: () => `https://mock-host/on/demandware.store/Sites-MockSite-Site/default/${action}`,
  })),
};
