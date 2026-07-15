import airTrackerService from '../airTrackerService';

const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

class MockHTTPService {
  url = '';
  method = '';
  headers: Record<string, string> = {};

  setURL(url: string) {
    this.url = url;
  }

  setRequestMethod(method: string) {
    this.method = method;
  }

  addHeader(key: string, value: string) {
    this.headers[key] = value;
  }
}

const mockRegistry = LocalServiceRegistry as {
  createService: jest.Mock;
  _getLastCallbacks: () => {
    createRequest: (service: MockHTTPService, payload: object) => string;
    filterLogMessage: (message: string) => string;
  };
  _reset: () => void;
};

describe('airTrackerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistry._reset();
    airTrackerService.clearServiceCache();
  });

  it('uses the demo AirTracker endpoint', () => {
    expect(airTrackerService.getBaseUrl('demo')).toBe('https://o11y-demo.airwallex.com');
  });

  it('uses the production AirTracker endpoint', () => {
    expect(airTrackerService.getBaseUrl('production')).toBe('https://o11y.airwallex.com');
  });

  it('creates a POST request for the AirTracker logs endpoint', () => {
    airTrackerService.createAirTrackerService('demo');
    const callbacks = mockRegistry._getLastCallbacks();
    const service = new MockHTTPService();
    const payload = { commonData: {}, data: [] };

    const body = callbacks.createRequest(service, payload);

    expect(service.url).toBe('https://o11y-demo.airwallex.com/airtracker/logs');
    expect(service.method).toBe('POST');
    expect(service.headers['Content-Type']).toBe('application/json');
    expect(body).toBe(JSON.stringify(payload));
    expect(LocalServiceRegistry.createService).toHaveBeenCalledWith('AirwallexAirTracker', expect.any(Object));
  });

  it('does not expose telemetry payloads in communication logs', () => {
    airTrackerService.createAirTrackerService('demo');
    const callbacks = mockRegistry._getLastCallbacks();

    expect(callbacks.filterLogMessage('sensitive payload')).toBe('[AirTracker payload omitted]');
  });
});
