// Mock for dw/system/Transaction
// This file is used by Jest's moduleNameMapper to resolve dw/system/Transaction
module.exports = {
  wrap: jest.fn(callback => {
    return callback();
  }),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

