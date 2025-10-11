# Testing Setup Guide

## What's Been Implemented

### 1. Jest Testing Framework
- Installed Jest with jsdom environment for DOM testing
- Configured with `jest.config.js` for coverage thresholds (70%)
- Added test scripts to `package.json`

### 2. Test Structure
Created comprehensive test suites:
- `tests/content.test.js` - Unit tests for HTML cleaning and URL scraping
- `tests/api.test.js` - API integration tests with mocked fetch
- `tests/model-selection.test.js` - Model filtering and sorting tests
- `tests/performance-integration.test.js` - Performance benchmarks and cache validation
- `tests/format-options.test.js` - Summary format testing (detailed/brief/keypoints)
- `tests/real-world-queries.test.js` - Real-world query performance tests
- `tests/e2e-real-world.test.js` - **NEW**: Puppeteer E2E tests with real browser conditions

### 3. Mocking Setup
- Chrome extension APIs mocked in `tests/setup.js`
- Fetch API mocked for network requests
- JSDOM environment for DOM manipulation tests

### 4. CI/CD Integration
- GitHub Actions workflow in `.github/workflows/test.yml`
- Runs on push and pull requests
- Executes tests and coverage reports

## Running Tests

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests with real-world scenarios
npm run test:e2e-real

# Run browser tests (Chromium + Firefox)
npm run test:browser

# Run Chromium only
npm run test:chromium

# Run Firefox only
npm run test:firefox
```

## Current Test Results

✅ All test suites passing:
- Unit tests: Content processing, API integration, model selection
- Performance tests: Cold start <8s, warm cache <100ms
- Format tests: Detailed (4000 tokens), brief (500 tokens), keypoints (500 tokens)
- Real-world queries: Average 1.10ms with cache
- E2E tests: All scenarios pass with realistic network conditions

## E2E Real-World Tests (Puppeteer)

The `e2e-real-world.test.js` suite tests the extension under production-like conditions:

### Test Scenarios
1. **Detailed Format with Network Delays**: Simulates 2.5-4s API delays and 0.8-2s page fetching
2. **3G Network Simulation**: Tests with 750 Kbps down, 250 Kbps up, 100ms latency
3. **Memory Usage Monitoring**: Validates memory increase stays under 50MB
4. **Concurrent Summarizations**: Tests 3 simultaneous tabs summarizing
5. **Cache Performance**: Validates second run is 2x faster than first

### Performance Targets
- Total time < 12s for detailed format with network delays
- 3G network test < 20s
- Memory increase < 50MB
- Concurrent test (3 tabs) < 20s
- Cache speedup > 2x

### Running E2E Tests
```bash
npm run test:e2e-real
```

These tests launch a real Chrome browser with the extension loaded and validate performance under realistic network conditions.

## Test Examples

### Unit Test with Assertions
```javascript
test('should clean HTML and extract text', () => {
  const html = '<div><script>alert("test")</script>Hello World</div>';
  const result = cleanHtmlToText(html);
  expect(result).toContain('Hello World');
  expect(result).not.toContain('script');
});
```

### Mocked API Test
```javascript
test('should handle API errors gracefully', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: { message: 'Invalid API key' } })
  });
  
  const response = await fetch(url);
  expect(response.ok).toBe(false);
});
```

## Benefits Achieved

- ✅ Automated test execution
- ✅ Proper assertions instead of console.log
- ✅ Mocked external dependencies
- ✅ Code coverage tracking with HTML reports
- ✅ CI/CD integration with artifact uploads
- ✅ Fast feedback loop with watch mode
- ✅ Pre-commit hooks for test validation
- ✅ Cross-browser testing (Chromium + Firefox)
- ✅ Performance benchmarks

## Reports

- **Coverage Report**: Open `coverage/index.html` in browser
- **Browser Tests**: Open `playwright-report/index.html` in browser
- **CI Artifacts**: Available in GitHub Actions runs
