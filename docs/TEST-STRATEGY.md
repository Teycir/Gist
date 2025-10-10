# Test Strategy

## Coverage Requirements

- **Minimum Coverage**: 70% for statements, branches, functions, and lines
- **Critical Paths**: 100% coverage for API calls and content processing
- **UI Components**: 80% coverage for popup interactions

## Test Types

### Unit Tests (Jest)
- Content processing functions
- API integration with mocks
- Model selection logic
- Edge cases and error handling

### Browser Tests (Playwright)
- Chromium compatibility
- Firefox compatibility
- Cross-browser consistency

### Performance Tests
- Text processing < 100ms
- API response handling
- Concurrent request handling

## Test Execution

```bash
npm test              # Unit tests
npm run test:coverage # Coverage report (HTML + terminal)
npm run test:browser  # Cross-browser tests
```

## CI/CD Pipeline

- **Pre-commit**: Run unit tests
- **Push**: Run all tests + coverage
- **Pull Request**: Full test suite + browser tests

## Reports

- **Coverage**: `coverage/index.html`
- **Browser Tests**: `playwright-report/index.html`
