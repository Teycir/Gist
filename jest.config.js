module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'content/**/*.js',
    'popup/**/*.js',
    'background.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/lib/**'
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 19,
      statements: 18
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js', '<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'e2e.test.js', 'e2e-real-world.test.js', '/browser/', 'background.test.js', 'model-selectors-isolated.test.js', 'gemini-selector.test.js']
};
