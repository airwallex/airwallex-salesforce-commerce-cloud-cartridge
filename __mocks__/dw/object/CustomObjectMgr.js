// Mock for dw/object/CustomObjectMgr
const customObjects = new Map();

const createMockCustomObject = (typeId, keyValue) => ({
  UUID: `uuid-${keyValue}`,
  type: typeId,
  custom: {
    eventId: keyValue,
    eventName: '',
    payload: '',
    status: 'PENDING',
    retryCount: 0,
    errorMessage: null,
    createdAt: null,
    processedAt: null,
  },
});

// Mock query result iterator
const createQueryResult = items => {
  let index = 0;
  return {
    hasNext: () => index < items.length,
    next: () => items[index++],
    close: jest.fn(),
  };
};

module.exports = {
  getCustomObject: jest.fn((typeId, keyValue) => {
    const key = `${typeId}:${keyValue}`;
    return customObjects.get(key) || null;
  }),

  createCustomObject: jest.fn((typeId, keyValue) => {
    const key = `${typeId}:${keyValue}`;
    const obj = createMockCustomObject(typeId, keyValue);
    customObjects.set(key, obj);
    return obj;
  }),

  queryCustomObjects: jest.fn((typeId, query, sortOrder, ...args) => {
    const items = [];
    customObjects.forEach((obj, key) => {
      if (key.startsWith(`${typeId}:`)) {
        // Simple filter - if looking for PENDING status
        if (query.includes('status') && args[0]) {
          if (obj.custom.status === args[0]) {
            items.push(obj);
          }
        } else {
          items.push(obj);
        }
      }
    });
    return createQueryResult(items);
  }),

  remove: jest.fn(customObject => {
    const key = `${customObject.type}:${customObject.custom.eventId}`;
    customObjects.delete(key);
  }),

  // Test helpers
  _reset: () => {
    customObjects.clear();
  },
  _addCustomObject: (typeId, keyValue, customData = {}) => {
    const key = `${typeId}:${keyValue}`;
    const obj = createMockCustomObject(typeId, keyValue);
    Object.assign(obj.custom, customData);
    customObjects.set(key, obj);
    return obj;
  },
  _getCustomObjects: () => customObjects,
};
