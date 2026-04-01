module.exports = {
  setupFiles: ['<rootDir>/jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^dw/(.*)$': '<rootDir>/__mocks__/dw/$1.js',
  },
  passWithNoTests: true,
};
