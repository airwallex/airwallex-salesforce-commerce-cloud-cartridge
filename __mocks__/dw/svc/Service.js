// Mock for dw/svc/Service
// Base service class

class MockService {
  constructor() {
    this.configuration = {};
  }

  call(request) {
    return {
      ok: true,
      object: {},
      error: null,
      errorMessage: null,
      msg: null,
      status: 'OK',
    };
  }

  getConfiguration() {
    return this.configuration;
  }
}

module.exports = MockService;
