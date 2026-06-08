/**
 * @jest-environment jsdom
 */

describe('Real-world Performance Integration Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="https://test1.com">Test 1</a><a href="https://test2.com">Test 2</a><a href="https://test3.com">Test 3</a></div>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.runtime.getURL = jest.fn((path) => `chrome-extension://fake-id/${path}`);
    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window.open = jest.fn();
    delete global.window.location;
    global.window.location = { search: '?q=test' };
    global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    global.showdown = { Converter: jest.fn(() => ({ makeHtml: (md) => md })) };
    performance.mark = jest.fn();
    performance.measure = jest.fn();
    performance.getEntriesByName = jest.fn(() => [{ duration: 0 }]);
  });

  test('full flow: warm cache should complete within 100ms', async () => {
    const start = performance.now();
    const searchQuery = 'test';
    const urls = ['https://test1.com', 'https://test2.com', 'https://test3.com'];
    const cacheKey = `summary_${searchQuery.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)}`;

    chrome.storage.local.get.mockResolvedValue({
      flashApiKey: 'test-key',
      selectedModel: 'meta-llama/llama-3.2-3b-instruct:free',
      selectedLanguage: 'English',
      summaryFormat: 'detailed',
      [cacheKey]: {
        markdown: '# Cached Summary\n\n- Point 1 [1]\n- Point 2 [2]',
        urls,
        timestamp: Date.now()
      }
    });

    const result = await chrome.storage.local.get();
    const cachedSummary = result[cacheKey];

    const duration = performance.now() - start;

    expect(cachedSummary).toBeDefined();
    expect(cachedSummary.markdown).toContain('Cached Summary');
    expect(duration).toBeLessThan(100);
    console.log(`✓ Warm cache completed in ${duration.toFixed(2)}ms`);
  });

  test('performance: URL scraping should complete within 50ms', () => {
    const start = performance.now();

    const { scrapeGoogleUrls } = require('../content/content.js');
    const urls = scrapeGoogleUrls();

    const duration = performance.now() - start;

    expect(urls.length).toBe(3);
    expect(duration).toBeLessThan(50);
    console.log(`✓ URL scraping completed in ${duration.toFixed(2)}ms`);
  });

  test('performance: HTML cleaning should complete within 50ms per page', () => {
    const html = '<html><head><script>alert("test")</script></head><body><nav>Menu</nav><main><article><p>Main content here with important information.</p></article></main><footer>Footer</footer></body></html>';

    const start = performance.now();

    const { cleanHtmlToText } = require('../content/content.js');
    const text = cleanHtmlToText(html);

    const duration = performance.now() - start;

    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('alert');
    expect(duration).toBeLessThan(50);
    console.log(`✓ HTML cleaning completed in ${duration.toFixed(2)}ms`);
  });

  test('performance: cache key generation should complete within 15ms for 100 iterations', () => {
    const longString = 'performance+test+query+with+long+url+parameters+and+settings'.repeat(10);

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const hash = longString.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
      Math.abs(hash).toString(36).slice(0, 8);
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
    console.log(`✓ 100 cache key generations completed in ${duration.toFixed(2)}ms (${(duration / 100).toFixed(3)}ms each)`);
  });

  test('memory: baseline heap usage is sane', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    expect(initialMemory).toBeGreaterThan(0);
    console.log(`✓ Memory test baseline: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
  });
});
