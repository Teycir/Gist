# Quick Test Reference Card

## 🚀 Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test content.test.js

# Run tests matching pattern
npm test -t "cache"

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# E2E real-world tests (Puppeteer)
npm run test:e2e-real

# Browser tests (Playwright)
npm run test:browser
```

---

## 📊 Test Types

| Type | Files | Purpose | Speed |
|------|-------|---------|-------|
| **Unit** | `*.test.js` | Individual functions | ⚡ Fast (ms) |
| **Integration** | `performance-*.test.js` | Component interactions | 🏃 Medium (100ms) |
| **E2E** | `e2e-*.test.js` | Full workflows | 🐢 Slow (seconds) |
| **Manual** | `MANUAL_TEST_GUIDE.md` | Production validation | 👤 Human |

---

## 🎯 Performance Targets

```
Cold Start:        < 8s     (Actual: 148ms)
Warm Cache:        < 100ms  (Actual: 5.78ms)
Detailed Format:   < 12s    (Actual: 8-10s)
3G Network:        < 20s    (Actual: 15-18s)
Memory Increase:   < 50MB   (Actual: 3-5MB)
Cache Speedup:     > 2x     (Actual: 20-50x)
```

---

## 🧪 Test Files Quick Reference

### Core Functionality
- `content.test.js` - HTML cleaning, URL scraping
- `api.test.js` - API calls, error handling
- `popup.test.js` - Settings UI

### Performance
- `performance-integration.test.js` - Benchmarks
- `real-world-queries.test.js` - Real queries
- `e2e-real-world.test.js` - **Production-like E2E**

### Features
- `format-options.test.js` - Summary formats
- `model-selection.test.js` - Model filtering
- `chrome-storage.test.js` - Storage operations

---

## 🔍 Debug Commands

```bash
# Verbose output
npm test -- --verbose

# Run single test
npm test -t "should clean HTML"

# No coverage collection (faster)
npm test -- --coverage=false

# Update snapshots
npm test -- -u

# Show test names only
npm test -- --listTests
```

---

## 📈 E2E Test Scenarios

1. **Detailed Format** - Network delays, quality validation
2. **3G Network** - Slow connection simulation
3. **Memory Usage** - Resource monitoring
4. **Concurrent** - Multiple tabs simultaneously
5. **Cache** - Performance validation

---

## 🛠️ Common Tasks

### Add New Test
```javascript
// tests/my-feature.test.js
describe('My Feature', () => {
  test('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### Mock Chrome API
```javascript
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};
```

### Mock Fetch
```javascript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'test' })
  })
);
```

---

## 📚 Documentation

- **[TESTING-SUMMARY.md](./TESTING-SUMMARY.md)** - Complete overview
- **[Readme-Testing.md](./Readme-Testing.md)** - Setup guide
- **[E2E-TEST-GUIDE.md](./tests/E2E-TEST-GUIDE.md)** - E2E details
- **[MANUAL_TEST_GUIDE.md](./MANUAL_TEST_GUIDE.md)** - Manual testing

---

## ✅ Pre-Commit Checklist

- [ ] All tests pass: `npm test`
- [ ] No console errors
- [ ] Coverage maintained: `npm run test:coverage`
- [ ] E2E tests pass: `npm run test:e2e-real`
- [ ] Manual smoke test on real Google search

---

## 🐛 Troubleshooting

**Tests timeout?**
→ Increase timeout in test file

**Memory test fails?**
→ Check for leaks, verify cleanup

**Cache test inconsistent?**
→ Clear cache, check timestamps

**E2E test fails?**
→ Check extension loads, verify mocks

---

## 💡 Pro Tips

- Use `test.only()` to run single test during development
- Use `test.skip()` to temporarily disable flaky tests
- Run `npm run test:watch` for instant feedback
- Check `coverage/index.html` for coverage gaps
- E2E tests run in headed mode - watch the browser!

---

**Quick Start**: `npm test` → All tests should pass ✅
