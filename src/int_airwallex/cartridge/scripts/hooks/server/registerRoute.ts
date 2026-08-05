import { flushBufferedLogs, startBufferedLogging } from '../../helpers/airTracker';

interface Route {
  on(eventName: 'route:Start' | 'route:Complete' | 'route:Redirect', handler: () => void): void;
}

const registerRoute = (route: Route): void => {
  route.on('route:Start', startBufferedLogging);
  route.on('route:Complete', flushBufferedLogs);
  route.on('route:Redirect', flushBufferedLogs);
};

module.exports = {
  registerRoute,
};

export { registerRoute };
