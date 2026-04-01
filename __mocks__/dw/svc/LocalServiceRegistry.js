// Mock for dw/svc/LocalServiceRegistry
let lastCallbacks = null;

const mockService = {
  call: jest.fn(),
};

module.exports = {
  createService: jest.fn((serviceId, callbacks) => {
    lastCallbacks = callbacks;
    return mockService;
  }),
  // Helper to get the callbacks passed to createService (for testing)
  _getLastCallbacks: () => lastCallbacks,
  _getMockService: () => mockService,
  _reset: () => {
    lastCallbacks = null;
    mockService.call.mockReset();
  },
};
