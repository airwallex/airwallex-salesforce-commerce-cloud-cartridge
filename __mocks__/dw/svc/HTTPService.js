// Mock for dw/svc/HTTPService
// This represents the service object passed to createRequest callback

class MockHTTPService {
  constructor() {
    this.url = '';
    this.method = '';
    this.headers = {};
  }

  setURL(url) {
    this.url = url;
  }

  setRequestMethod(method) {
    this.method = method;
  }

  addHeader(key, value) {
    this.headers[key] = value;
  }

  getURL() {
    return this.url;
  }

  getRequestMethod() {
    return this.method;
  }
}

// Factory function to create mock instances
const createMockHTTPService = () => new MockHTTPService();

module.exports = MockHTTPService;
module.exports.createMockHTTPService = createMockHTTPService;
