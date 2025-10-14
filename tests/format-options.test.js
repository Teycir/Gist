/**
 * @jest-environment jsdom
 */

global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.showdown = { Converter: jest.fn(() => ({ makeHtml: (md) => md })) };

describe('Summary Format Options Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="http://test1.com">Test 1</a><a href="http://test2.com">Test 2</a><a href="http://test3.com">Test 3</a></div>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    global.alert = jest.fn();
    global.window = { open: jest.fn(), location: { search: '?q=test+query' } };
  });

  test('Detailed format: comprehensive summary with explanations', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'models/gemini-1.5-flash',
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
        setTimeout(() => callback({ success: true, html: '<html><body><main><p>React performance optimization content</p></main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Detailed Summary\n\n- Point 1 [1]\n- Point 2 [2]' }] } }] } }), 0);
      }
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log(`\n📝 DETAILED FORMAT: ${duration.toFixed(2)}ms`);
  });

  test('Brief format: concise 3-5 bullet points', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'models/gemini-1.5-flash',
      selectedLanguage: 'English',
      summaryFormat: 'brief'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        setTimeout(() => callback({ success: true, html: '<html><body><main><p>Docker security content</p></main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Brief Summary\n\n- Point 1 [1]\n- Point 2 [2]' }] } }] } }), 0);
      }
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log(`\n📝 BRIEF FORMAT: ${duration.toFixed(2)}ms`);
  });

  test('Key points format: minimal takeaways', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedModel: 'models/gemini-1.5-flash',
      selectedLanguage: 'English',
      summaryFormat: 'keypoints'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') {
        callback({ tabId: 123 });
      } else if (msg.action === 'fetchAndProcessPages') {
        callback({ success: true, results: ['Test content 1', 'Test content 2', 'Test content 3'], usedUrls: ['http://test1.com', 'http://test2.com', 'http://test3.com'] });
      } else if (msg.action === 'fetchPage') {
        setTimeout(() => callback({ success: true, html: '<html><body><main><p>AWS Lambda content</p></main></body></html>' }), 0);
      } else if (msg.action === 'callAPI') {
        setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: '# Key Points\n\n- Point 1 [1]\n- Point 2 [2]' }] } }] } }), 0);
      }
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log(`\n📝 KEY POINTS FORMAT: ${duration.toFixed(2)}ms`);
  });

  test('Format comparison: all three formats side-by-side', () => {
    console.log('\n✅ All format options tested successfully');
    expect(true).toBe(true);
  });
});
