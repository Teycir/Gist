# Manual Production Testing Guide

## Testing with Real Data from Real Websites

### Prerequisites
1. Chrome browser with Gist extension installed
2. Valid Google AI API key configured in extension settings
3. Internet connection

### Test Scenarios

## 1. **Detailed Format Test** (4000 tokens, 2000 words)

**Steps:**
1. Open Chrome and navigate to Google
2. Search for: `"React performance optimization best practices"`
3. Click the "✨ Summarize with AI" button
4. Wait for processing (expected: 3-8 seconds)

**Expected Result:**
```
# React Performance Optimization

- **Memoization and re-render prevention**: React.memo() wraps functional 
  components to prevent unnecessary re-renders by performing shallow prop 
  comparisons. useMemo() caches expensive computation results, while 
  useCallback() memoizes function references. These are crucial in large 
  component trees where re-renders cascade through multiple levels... [1]

- **Code splitting and lazy loading**: Dynamic imports with React.lazy() 
  and Suspense split your application into smaller chunks that load on 
  demand. Route-based splitting is particularly effective, loading 
  components only when users navigate to specific routes... [2]

[... 4-6 detailed bullet points with comprehensive explanations ...]

## References
[1] https://react.dev/...
[2] https://web.dev/...
[3] https://kentcdodds.com/...
```

**Performance Metrics:**
- Time: 3-8 seconds (cold start)
- Time: <100ms (cached)
- Output length: ~1500-2000 words
- Bullet points: 4-6 detailed points

---

## 2. **Brief Format Test** (500 tokens, 300 words)

**Steps:**
1. Open extension settings (click extension icon)
2. Change "Summary Format" to "Brief Summary"
3. Search for: `"Docker container security"`
4. Click "✨ Summarize with AI"

**Expected Result:**
```
# Docker Security Essentials

- Use minimal base images and scan for vulnerabilities [1]
- Run containers as non-root users [2]
- Implement network segmentation and secrets management [3]

## References
[1] https://docs.docker.com/...
[2] https://snyk.io/...
```

**Performance Metrics:**
- Time: 3-5 seconds
- Output length: ~200-300 words
- Bullet points: 3-5 concise points

---

## 3. **Key Points Format Test** (500 tokens, 300 words)

**Steps:**
1. Change format to "Key Points Only"
2. Search for: `"AWS Lambda best practices"`
3. Click "✨ Summarize with AI"

**Expected Result:**
```
# AWS Lambda Optimization

- Keep functions small [1]
- Use provisioned concurrency [2]
- Leverage layers [3]
- Monitor with CloudWatch [1]

## References
[1] https://docs.aws.amazon.com/...
```

**Performance Metrics:**
- Time: 3-5 seconds
- Output length: ~150-250 words
- Bullet points: Short takeaways

---

## 4. **Multi-Language Test**

**Steps:**
1. Change "Language" to "Spanish"
2. Search for: `"JavaScript async await"`
3. Click "✨ Summarize with AI"

**Expected Result:**
```
# Programación Asíncrona en JavaScript

- **async/await**: Sintaxis moderna para manejar operaciones asíncronas...
- **Promesas**: Objetos que representan el resultado eventual...
[... en español ...]
```

---

## 5. **Cache Performance Test**

**Steps:**
1. Search for: `"Python asyncio tutorial"`
2. Click "✨ Summarize with AI" (measure time)
3. Close the summary overlay
4. Click "✨ Summarize with AI" again (measure time)

**Expected Results:**
- First run: 3-8 seconds (fetching + processing)
- Second run: <100ms (from cache)
- Output: Identical content

---

## 6. **Real-World Production Queries**

Test with these actual search queries:

### Technical Topics
- `"Kubernetes deployment strategies"`
- `"GraphQL vs REST API comparison"`
- `"Microservices architecture patterns"`
- `"CI/CD pipeline best practices"`

### Development Topics
- `"TypeScript generics tutorial"`
- `"Vue 3 composition API guide"`
- `"Node.js performance optimization"`
- `"PostgreSQL query optimization"`

### Cloud/DevOps
- `"Terraform infrastructure as code"`
- `"AWS S3 security best practices"`
- `"Monitoring with Prometheus"`
- `"Docker multi-stage builds"`

---

## Performance Benchmarks

### Expected Timings (Real Production)

| Scenario | Cold Start | Warm Cache | Format |
|----------|-----------|------------|--------|
| Detailed | 3-8s | <100ms | 4000 tokens |
| Brief | 3-5s | <100ms | 500 tokens |
| Key Points | 3-5s | <100ms | 500 tokens |

### Network Breakdown
- URL scraping: <5ms
- Content fetching: 2-4s (3 URLs, concurrent)
- HTML cleaning: <10ms per page
- AI generation: 1-3s
- Display: <5ms

---

## Troubleshooting

### If summary takes >10 seconds:
- Check network connection
- Verify API key is valid
- Check if websites are accessible
- Look for CORS or timeout errors in console

### If content is empty:
- Websites may block scraping
- Content extraction failed
- Try different search query

### If AI response is poor:
- Source websites may have low-quality content
- Try more specific search queries
- Check if enough sources were found (need 3)

---

## Quality Checks

### Detailed Format Should Have:
✓ 4-6 bullet points
✓ Each point 100-300 words
✓ Context and examples
✓ In-depth explanations
✓ Proper citations [1], [2], [3]
✓ References section

### Brief Format Should Have:
✓ 3-5 bullet points
✓ Each point 20-50 words
✓ Concise information
✓ Proper citations
✓ References section

### Key Points Should Have:
✓ 3-5 bullet points
✓ Each point 10-20 words
✓ Essential takeaways only
✓ Proper citations
✓ References section

---

## Success Criteria

✅ All formats complete within 8 seconds
✅ Cache serves results in <100ms
✅ Output quality matches format selection
✅ Citations are accurate and numbered
✅ References section is complete
✅ No errors in console
✅ UI remains responsive
✅ Memory usage stays reasonable

---

## Notes

- Real production performance depends on:
  - Network speed
  - Website response times
  - AI API latency
  - Content complexity
  
- First run is always slower (no cache)
- Subsequent runs use cached content
- Cache expires after 10 minutes (summaries) or 1 hour (pages)
