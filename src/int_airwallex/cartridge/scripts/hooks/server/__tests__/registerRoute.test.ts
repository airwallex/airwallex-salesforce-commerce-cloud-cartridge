jest.mock('../../../helpers/airTracker', () => ({
  startBufferedLogging: jest.fn(),
  flushBufferedLogs: jest.fn(),
}));

import airTracker from '../../../helpers/airTracker';
import { registerRoute } from '../registerRoute';

describe('AirTracker SFRA route lifecycle hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts buffering at route entry and flushes for completed and redirected routes', () => {
    const handlers: Record<string, () => void> = {};
    const route = {
      on: jest.fn((eventName: string, handler: () => void) => {
        handlers[eventName] = handler;
      }),
    };

    registerRoute(route);

    expect(route.on).toHaveBeenCalledWith('route:Start', airTracker.startBufferedLogging);
    expect(route.on).toHaveBeenCalledWith('route:Complete', airTracker.flushBufferedLogs);
    expect(route.on).toHaveBeenCalledWith('route:Redirect', airTracker.flushBufferedLogs);

    handlers['route:Start']();
    handlers['route:Redirect']();
    handlers['route:Complete']();

    expect(airTracker.startBufferedLogging).toHaveBeenCalledTimes(1);
    expect(airTracker.flushBufferedLogs).toHaveBeenCalledTimes(2);
  });

  it('is registered as the global SFRA route hook', () => {
    const hooks = require('../../../hooks.json') as {
      hooks: Array<{ name: string; script: string }>;
    };

    expect(hooks.hooks).toContainEqual({
      name: 'app.server.registerRoute',
      script: './hooks/server/registerRoute',
    });
  });
});
