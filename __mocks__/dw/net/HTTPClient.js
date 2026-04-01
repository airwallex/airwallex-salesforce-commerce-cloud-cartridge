// Mock for dw/net/HTTPClient
// This represents the client object passed to parseResponse callback

class MockHTTPClient {
  constructor(options = {}) {
    this.statusCode = options.statusCode || 200;
    this.text = options.text || '';
    this.errorText = options.errorText || '';
  }
}

// Factory function to create mock instances
const createMockHTTPClient = (options) => new MockHTTPClient(options);

module.exports = MockHTTPClient;
module.exports.createMockHTTPClient = createMockHTTPClient;
