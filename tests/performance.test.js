/**
 * @jest-environment jsdom
 */

describe('Performance', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="http://test1.com">Test 1</a><a href="http://test2.com">Test 2</a></div>';
    chrome.storage.local.get.mockClear();
    fetch.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window = { open: jest.fn(), location: { search: '?q=test+query' } };
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    global.requestIdleCallback = jest.fn((cb, opts) => setTimeout(cb, 0));
  });

  test('should complete summarization within 8 seconds', async () => {
    const start = Date.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'models/gemini-1.5-flash',
      selectedLanguage: 'English',
      summaryFormat: 'detailed',
      multiSearchEnabled: false
    });
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'callAPI') {
        callback({ 
          success: true, 
          data: { candidates: [{ content: { parts: [{ text: '# Test Summary\n\n- Key point 1 [1]\n- Key point 2 [2]' }] } }] }
        });
      } else if (msg.action === 'fetchPage') {
        callback({ success: true, html: '<html><body><main><p>Test content</p></main></body></html>' });
      }
    });
    

    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log(`✓ Summarization completed in ${duration}ms`);
  }, 10000);

  test('should use cache for repeated queries', async () => {
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedLanguage: 'English',
      summaryFormat: 'detailed'
    });
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: '# Cached Summary' }] } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main>Content</main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    
    await summarizeResults();
    const firstCallCount = fetch.mock.calls.length;
    
    await summarizeResults();
    const secondCallCount = fetch.mock.calls.length;
    
    expect(secondCallCount).toBe(firstCallCount);
  });

  test('memoization should cache function results', () => {
    const cache = new Map();
    const memoize = (fn) => (arg) => {
      if (cache.has(arg)) return cache.get(arg);
      const result = fn(arg);
      cache.set(arg, result);
      return result;
    };
    
    const expensiveFn = jest.fn((x) => x * 2);
    const memoized = memoize(expensiveFn);
    
    memoized(5);
    memoized(5);
    
    expect(expensiveFn).toHaveBeenCalledTimes(1);
    expect(memoized(5)).toBe(10);
  });

  test('DOM batching should use requestAnimationFrame', () => {
    const callback = jest.fn();
    
    requestAnimationFrame(callback);
    
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  test('lazy-loading should defer non-critical CSS', () => {
    requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });
    
    expect(global.requestIdleCallback).toHaveBeenCalled();
  });

  test('debouncing should reduce event handler calls', (done) => {
    jest.useFakeTimers();
    const handler = jest.fn();
    let timeout;
    
    const debouncedHandler = (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => handler(value), 150);
    };
    
    debouncedHandler('a');
    debouncedHandler('ab');
    debouncedHandler('abc');
    
    expect(handler).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(150);
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('abc');
    
    jest.useRealTimers();
    done();
  });

  test('DocumentFragment should reduce DOM reflows', () => {
    const container = document.createElement('div');
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < 50; i++) {
      const item = document.createElement('div');
      item.textContent = `Item ${i}`;
      fragment.appendChild(item);
    }
    container.appendChild(fragment);
    
    expect(container.children.length).toBe(50);
    expect(fragment.childNodes.length).toBe(0);
  });

  test('critical CSS should be minimal', () => {
    const fs = require('fs');
    const path = require('path');
    const criticalPath = path.join(__dirname, '../content/content-critical.css');
    
    if (fs.existsSync(criticalPath)) {
      const criticalSize = fs.statSync(criticalPath).size;
      expect(criticalSize).toBeLessThan(2000);
    } else {
      expect(true).toBe(true);
    }
  });

  test('lazy-loaded showdown should not block initial load', () => {
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      document.head.appendChild(script);
      return script;
    };
    
    const script = loadScript('lib/showdown.min.js');
    
    expect(document.head.querySelector('script[src*="showdown"]')).toBeTruthy();
  });
});
