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
});
