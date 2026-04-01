// Mock for dw/system/CacheMgr
let cacheStore = {};

const createMockCache = (cacheId) => ({
  get: jest.fn((key) => cacheStore[`${cacheId}:${key}`] || null),
  put: jest.fn((key, value) => {
    cacheStore[`${cacheId}:${key}`] = value;
  }),
  invalidate: jest.fn((key) => {
    delete cacheStore[`${cacheId}:${key}`];
  }),
});

const caches = {};

module.exports = {
  getCache: jest.fn((cacheId) => {
    if (!caches[cacheId]) {
      caches[cacheId] = createMockCache(cacheId);
    }
    return caches[cacheId];
  }),
  // Test helpers
  _reset: () => {
    cacheStore = {};
    Object.keys(caches).forEach((key) => delete caches[key]);
  },
  _getStore: () => cacheStore,
  _setStore: (key, value) => {
    cacheStore[key] = value;
  },
};
