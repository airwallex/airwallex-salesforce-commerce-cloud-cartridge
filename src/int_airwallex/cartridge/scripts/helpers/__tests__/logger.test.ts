jest.mock('../airTracker', () => ({
  trackLog: jest.fn(),
}));

import logger from '../logger';
import airTracker from '../airTracker';

const Logger = require('dw/system/Logger');

describe('logger AirTracker mirroring', () => {
  const localLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Logger.getLogger.mockReturnValue(localLogger);
  });

  it('writes info logs locally and mirrors the same message to AirTracker', () => {
    logger.info('PaymentIntent created', { status: 'SUCCEEDED' });

    const formattedMessage = 'PaymentIntent created | {"status":"SUCCEEDED"}';
    expect(localLogger.info).toHaveBeenCalledWith(formattedMessage);
    expect(airTracker.trackLog).toHaveBeenCalledWith('info', 'sfcc_info', 'PaymentIntent created', {
      status: 'SUCCEEDED',
    });
  });

  it('maps every local log level to the matching AirTracker event', () => {
    logger.debug('Debug message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(airTracker.trackLog).toHaveBeenCalledWith('info', 'sfcc_debug', 'Debug message');
    expect(airTracker.trackLog).toHaveBeenCalledWith('info', 'sfcc_warning', 'Warning message');
    expect(airTracker.trackLog).toHaveBeenCalledWith('error', 'sfcc_error', 'Error message');
  });

  it('preserves local logging when AirTracker forwarding throws', () => {
    (airTracker.trackLog as jest.Mock).mockImplementation(() => {
      throw new Error('AirTracker unavailable');
    });

    expect(() => logger.info('Checkout started')).not.toThrow();
    expect(localLogger.info).toHaveBeenCalledWith('Checkout started');
  });
});
