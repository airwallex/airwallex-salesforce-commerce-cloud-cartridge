module.exports = {
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.js'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          isolatedModules: true,
          jsx: 'react-jsx',
          jsxImportSource: '@emotion/react',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^dw/(.*)$': '<rootDir>/__mocks__/dw/$1.js',
    // Match before the @/ alias so `import x from '@/assets/icon.svg?inline'` is stubbed.
    '^@/.*\\.svg(\\?.*)?$': '<rootDir>/__mocks__/svgMock.js',
    '\\.svg(\\?.*)?$': '<rootDir>/__mocks__/svgMock.js',
    // Keep @/cartridge on tsconfig paths; map remaining @/ aliases to bm-web.
    '^@/(?!cartridge/)(.*)$': '<rootDir>/packages/bm-web/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    'packages/bm-web/src/**/*.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
    '!**/packageVersion.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  passWithNoTests: true,
};
