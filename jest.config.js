module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'content/**/*.js',
    'popup/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/lib/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'e2e.test.js', 'e2e-real-world.test.js', '/browser/']
};
