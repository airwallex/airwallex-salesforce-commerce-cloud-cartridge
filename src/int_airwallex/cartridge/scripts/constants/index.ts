/**
 * Barrel export for constants
 */

export * from './apiEndpoints';
// export * from './paymentStatus';
export * from './errorCodes';

import apiEndpoints from './apiEndpoints';
// import paymentStatus from './paymentStatus';
import errorCodes from './errorCodes';

const constants = {
  ...apiEndpoints,
  // ...paymentStatus,
  ...errorCodes,
};

module.exports = constants;
export default constants;
