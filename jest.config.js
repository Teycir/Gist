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
      branches: 14,
      functions: 13,
      lines: 16,
      statements: 15
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js', '<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'e2e.test.js', 'e2e-real-world.test.js', '/browser/', 'background.test.js', 'model-selectors-isolated.test.js', 'gemini-selector.test.js']
};
