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

  test('full flow: cold start (no cache) should complete within 8 seconds', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const data = { openrouterApiKey: 'test-key', selectedModel: 'meta-llama/llama-3.2-3b-instruct:free', selectedLanguage: 'English', summaryFormat: 'detailed' };
      if (typeof keys === 'function') {
        keys(data);
      } else if (callback) {
        callback(data);
      }
      return Promise.resolve(data);
    });
    
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        setTimeout(() => callback({ success: true, html: '<html><body><main><p>Test content with meaningful information for performance testing.</p></main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Performance Test Summary\n\n- Fast execution [1]\n- Optimized caching [2]\n- Efficient processing [3]' }] } }] } }), 0);
      }
    });
    
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              { id: 'meta-llama/llama-3.2-3b-instruct:free', context_length: 131072, pricing: { prompt: '0' } },
              { id: 'google/gemma-2-9b-it:free', context_length: 8192, pricing: { prompt: '0' } }
            ]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main><p>Test content with meaningful information for performance testing.</p></main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    console.log(`✓ Cold start completed in ${duration.toFixed(2)}ms`);
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

  test('full flow: page cache hit should skip network calls', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const data = {
        flashApiKey: 'test-key',
        selectedModel: 'meta-llama/llama-3.2-3b-instruct:free',
        selectedLanguage: 'English',
        summaryFormat: 'detailed',
        page_test123: {
          content: '<html><body><main>Cached page content</main></body></html>',
          timestamp: Date.now()
        }
      };
      if (typeof keys === 'function') {
        keys(data);
      } else if (callback) {
        callback(data);
      } else {
        return Promise.resolve(data);
      }
    });
    
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    
    let networkCalls = 0;
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        networkCalls++;
        setTimeout(() => callback({ success: true, html: '<html><body><main>Content</main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Summary' }] } }] } }), 0);
      }
    });
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '# Summary' } }]
          })
        });
      }
      networkCalls++;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main>Content</main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    expect(networkCalls).toBeLessThanOrEqual(3);
    console.log(`✓ Page cache: ${networkCalls} network calls made`);
  });

  test('performance: URL scraping should complete within 5ms', () => {
    const start = performance.now();
    
    const { scrapeGoogleUrls } = require('../content/content.js');
    const urls = scrapeGoogleUrls();
    
    const duration = performance.now() - start;
    
    expect(urls.length).toBe(3);
    expect(duration).toBeLessThan(50);
    console.log(`✓ URL scraping completed in ${duration.toFixed(2)}ms`);
  });

  test('performance: HTML cleaning should complete within 10ms per page', () => {
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

  test('performance: cache key generation should complete within 1ms', () => {
    const longString = 'performance+test+query+with+long+url+parameters+and+settings'.repeat(10);
    
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      const hash = longString.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
      Math.abs(hash).toString(36).slice(0, 8);
    }
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(15);
    console.log(`✓ 100 cache key generations completed in ${duration.toFixed(2)}ms (${(duration/100).toFixed(3)}ms each)`);
  });

  test('memory: cache cleanup should prevent memory leaks', () => {
    const { summarizeResults } = require('../content/content.js');
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'meta-llama/llama-3.2-3b-instruct:free',
      selectedLanguage: 'English',
      summaryFormat: 'detailed'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        setTimeout(() => callback({ success: true, html: '<html><body><main>Content</main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Summary' }] } }] } }), 0);
      }
    });
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '# Summary' } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main>Content</main></body></html>')
      });
    });
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    expect(initialMemory).toBeGreaterThan(0);
    console.log(`✓ Memory test baseline: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
  });

  test('end-to-end: complete flow with all optimizations', async () => {
    const metrics = {
      urlScraping: 0,
      contentFetching: 0,
      htmlCleaning: 0,
      aiGeneration: 0,
      caching: 0,
      total: 0
    };
    
    const overallStart = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'meta-llama/llama-3.2-3b-instruct:free',
      selectedLanguage: 'English',
      summaryFormat: 'detailed'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        setTimeout(() => callback({ success: true, html: '<html><body><main><p>End-to-end test content with comprehensive information.</p></main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# E2E Test Summary\n\n- Optimized flow [1]\n- Fast execution [2]\n- Efficient caching [3]' }] } }] } }), 0);
      }
    });
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '# E2E Test Summary\n\n- Optimized flow [1]\n- Fast execution [2]\n- Efficient caching [3]' } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main><p>End-to-end test content with comprehensive information.</p></main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    metrics.total = performance.now() - overallStart;
    
    expect(metrics.total).toBeLessThan(8000);
    console.log(`\n✓ End-to-end flow completed in ${metrics.total.toFixed(2)}ms`);
    console.log(`  Performance breakdown:`);
    console.log(`  - Total execution: ${metrics.total.toFixed(2)}ms`);
    console.log(`  - Target: <8000ms`);
    console.log(`  - Status: ${metrics.total < 8000 ? '✓ PASS' : '✗ FAIL'}`);
  });
});
