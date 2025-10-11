# E2E Real-World Test Guide

## Overview
The `e2e-real-world.test.js` suite uses Puppeteer to test the Chrome extension under production-like conditions with real browser instances, network delays, and resource monitoring.

## Test Suite Details

### 1. Detailed Format with Simulated Network Delays
**Purpose**: Validate performance with realistic API and page fetch delays

**Simulated Conditions**:
- AI API response: 2.5s delay
- Page content fetching: 1s delay per page
- 3 search result pages

**Validates**:
- Total time < 12s
- Summary length > 1000 characters
- Summary contains expected content
- Detailed format produces comprehensive output

**Expected Output**:
```
📊 REAL-WORLD E2E TEST RESULTS (Detailed Format)
⏱️  Total Time: ~8000ms
🌐 Content Fetching: ~3000ms
🤖 AI Generation: ~2500ms
📝 Summary Length: ~2000 characters
✅ Status: PASS
```

---

### 2. 3G Network Simulation
**Purpose**: Test extension performance on slow mobile networks

**Network Conditions**:
- Download: 750 Kbps
- Upload: 250 Kbps
- Latency: 100ms
- Format: Brief

**Validates**:
- Total time < 20s on 3G
- Extension remains functional on slow connections
- Brief format works under constrained conditions

**Use Case**: Users on mobile devices or poor connectivity

---

### 3. Memory Usage Monitoring
**Purpose**: Ensure extension doesn't leak memory or consume excessive resources

**Monitors**:
- Initial JS heap size
- Post-summarization heap size
- Memory increase delta

**Validates**:
- Memory increase < 50MB
- No memory leaks
- Efficient resource usage

**Expected Output**:
```
💾 Initial Memory: 15.23MB
💾 After Summarization: 18.45MB
📈 Memory Increase: 3.22MB
```

---

### 4. Concurrent Summarizations
**Purpose**: Test extension stability with multiple simultaneous operations

**Test Setup**:
- Opens 3 browser tabs
- Triggers summarization in all tabs simultaneously
- Uses keypoints format for faster execution

**Validates**:
- Total time < 20s for 3 concurrent operations
- No race conditions or conflicts
- All tabs complete successfully

**Use Case**: Power users with multiple search tabs open

---

### 5. Cache Performance Validation
**Purpose**: Verify caching system provides significant speedup

**Test Flow**:
1. First summarization (cold start)
2. Close summary overlay
3. Second summarization (should use cache)

**Validates**:
- Second run is 2x faster than first
- Cache hit reduces API calls
- Cache invalidation works correctly

**Expected Output**:
```
💾 Cache Performance:
   First run: 5000ms
   Second run (cached): 150ms
   Speedup: 33.3x faster
```

---

## Running the Tests

### Run All E2E Tests
```bash
npm run test:e2e-real
```

### Run Specific Test
```bash
npx jest tests/e2e-real-world.test.js -t "Detailed format"
```

### Run with Verbose Output
```bash
npx jest tests/e2e-real-world.test.js --verbose
```

### Run in Headed Mode (See Browser)
The tests already run in headed mode (`headless: false`) so you can watch the browser interactions.

---

## Understanding Test Results

### Success Indicators
- ✅ All assertions pass
- ⏱️ Performance targets met
- 💾 Memory usage within limits
- 🌐 Network conditions handled properly

### Common Failures

**Timeout Errors**:
- Increase `TEST_TIMEOUT` constant
- Check network simulation delays
- Verify extension loads correctly

**Memory Limit Exceeded**:
- Check for memory leaks in content.js
- Verify cache cleanup runs properly
- Review DOM manipulation efficiency

**Cache Not Working**:
- Verify cache keys are consistent
- Check cache expiration times
- Ensure Chrome storage mock works

---

## Performance Benchmarks

| Test Scenario | Target | Typical Result |
|--------------|--------|----------------|
| Detailed Format | < 12s | 8-10s |
| 3G Network | < 20s | 15-18s |
| Memory Increase | < 50MB | 3-5MB |
| Concurrent (3 tabs) | < 20s | 12-15s |
| Cache Speedup | > 2x | 20-50x |

---

## Debugging Tips

### View Browser Console
Tests run in headed mode, so you can:
1. Open DevTools in the Puppeteer browser
2. Check console logs
3. Inspect network requests
4. Monitor memory usage

### Add Custom Logging
```javascript
await page.evaluate(() => {
  console.log('Custom debug info:', window.someVariable);
});
```

### Take Screenshots
```javascript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Slow Down Execution
```javascript
await page.waitForTimeout(5000); // Wait 5 seconds
```

---

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines but require:
- Headless mode enabled for CI
- Sufficient timeout values
- Chrome/Chromium installed on CI server

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e-real
  env:
    CI: true
```

---

## Maintenance Notes

### Updating Network Delays
Adjust delays in request interception:
```javascript
setTimeout(() => {
  request.respond({ ... });
}, 2500); // Change this value
```

### Modifying Performance Targets
Update expectations in test assertions:
```javascript
expect(metrics.total).toBeLessThan(12000); // Adjust threshold
```

### Adding New Test Scenarios
Follow the existing pattern:
1. Create new test case
2. Set up page and mocks
3. Trigger summarization
4. Validate results
5. Log metrics

---

## Related Documentation
- [MANUAL_TEST_GUIDE.md](../MANUAL_TEST_GUIDE.md) - Manual testing procedures
- [Readme-Testing.md](../Readme-Testing.md) - Overall testing strategy
- [performance-integration.test.js](./performance-integration.test.js) - Unit-level performance tests
