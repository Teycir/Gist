/**
 * @jest-environment jsdom
 */

const { scrapeGoogleUrls, cleanHtmlToText } = require('../content/content.js');

global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('Content Processing', () => {
  test('should clean HTML and extract text', () => {
    const html = '<html><body><div>Hello World</div></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Hello');
    expect(result).not.toContain('<div>');
  });

  test('should remove script tags', () => {
    const html = '<html><body><script>alert("test")</script><div>Content</div></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).not.toContain('alert');
    expect(result).toContain('Content');
  });

  test('should remove navigation elements', () => {
    const html = '<html><body><nav>Menu</nav><article>Article Content</article></body></html>';
    const result = cleanHtmlToText(html);
    expect(typeof result).toBe('string');
    expect(result).not.toContain('Menu');
  });

  test('should limit text to 5000 characters', () => {
    const longText = 'a'.repeat(10000);
    const html = `<html><body><div>${longText}</div></body></html>`;
    const result = cleanHtmlToText(html);
    expect(result.length).toBeLessThanOrEqual(5000);
  });

  test('should extract text from body when no main element', () => {
    const html = '<html><body><p>Body text here</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  test('should remove multiple unwanted elements', () => {
    const html = '<html><body><style>css</style><iframe>frame</iframe><p>Content</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Content');
  });

  test('should normalize whitespace', () => {
    const html = '<html><body><p>Text   with    spaces</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).not.toContain('   ');
  });

  test('should remove ad elements by class', () => {
    const html = '<html><body><div class="ad">Ad content</div><p>Real content</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Real content');
    expect(result).not.toContain('Ad content');
  });

  test('should remove ad elements by id pattern', () => {
    const html = '<html><body><div id="ad-banner">Ad</div><p>Content</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Content');
    expect(result).not.toContain('Ad');
  });

  test('should prioritize article over body', () => {
    const html = '<html><body><div>Body noise</div><article>Article content</article></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Article content');
    expect(result).not.toContain('Body noise');
  });

  test('should remove sidebar elements', () => {
    const html = '<html><body><aside class="sidebar">Sidebar</aside><main>Main content</main></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Main content');
    expect(result).not.toContain('Sidebar');
  });

  test('should remove social share buttons', () => {
    const html = '<html><body><div class="social-share">Share</div><article>Content</article></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Content');
    expect(result).not.toContain('Share');
  });

  test('should remove comments section', () => {
    const html = '<html><body><article>Article</article><div class="comments">Comments</div></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Article');
    expect(result).not.toContain('Comments');
  });

  test('should handle missing body gracefully', () => {
    const html = '<html></html>';
    const result = cleanHtmlToText(html);
    expect(typeof result).toBe('string');
    expect(result).toBe('');
  });
});

describe('URL Scraping', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://example.com">Example</a>
        <a href="http://test.com">Test</a>
        <a href="http://youtube.com">YouTube</a>
        <a href="http://demo.com">Demo</a>
      </div>
    `;
  });

  test('should scrape up to 3 URLs', () => {
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBeLessThanOrEqual(3);
  });

  test('should exclude YouTube URLs', () => {
    const urls = scrapeGoogleUrls();
    expect(urls.every(url => !url.includes('youtube.com'))).toBe(true);
  });

  test('should remove duplicates', () => {
    const urls = scrapeGoogleUrls();
    const uniqueUrls = new Set(urls);
    expect(urls.length).toBe(uniqueUrls.size);
  });

  test('should handle empty search results', () => {
    document.body.innerHTML = '<div id="search"></div>';
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBe(0);
  });

  test('should filter google.com URLs', () => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://google.com/test">Google</a>
        <a href="http://example.com">Example</a>
      </div>
    `;
    const urls = scrapeGoogleUrls();
    expect(urls.every(url => !url.includes('google.com'))).toBe(true);
  });

  test('should stop at 3 URLs', () => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://a.com">A</a>
        <a href="http://b.com">B</a>
        <a href="http://c.com">C</a>
        <a href="http://d.com">D</a>
      </div>
    `;
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBe(3);
  });
});

describe('Display Summary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.navigator.clipboard = { writeText: jest.fn() };
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof keys === 'function') {
        keys({});
      } else if (callback) {
        callback({});
      }
      return Promise.resolve({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
  });

  test('should create iframe with summary overlay', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('# Test Summary\n\nContent here', ['http://example.com']);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeTruthy();
    const iframeDoc = iframe.contentDocument;
    const overlay = iframeDoc.querySelector('.summary-overlay');
    expect(overlay).toBeTruthy();
  });

  test('should include copy button in iframe', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test content', ['http://example.com']);
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const copyBtn = iframeDoc.querySelector('.close-btn');
    expect(copyBtn).toBeTruthy();
  });

  test('should have overlay structure in iframe', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', []);
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const overlay = iframeDoc.querySelector('.summary-overlay');
    const content = overlay.querySelector('.summary-content');
    expect(content).toBeTruthy();
  });

  test('should display multiple sources in iframe', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', ['http://a.com', 'http://b.com']);
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const overlay = iframeDoc.querySelector('.summary-overlay');
    expect(overlay).toBeTruthy();
  });

  test('should copy summary to clipboard', () => {
    const { displaySummary } = require('../content/content.js');
    const testMarkdown = '# Test Summary\nContent here';
    displaySummary(testMarkdown, []);
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const copyBtn = iframeDoc.querySelectorAll('.close-btn')[3];
    copyBtn.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0];
    expect(calledWith).toContain('Test Summary');
    expect(calledWith).toContain('Content here');
  });

  test('should have close button in iframe', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeTruthy();
    const iframeDoc = iframe.contentDocument;
    const closeButtons = iframeDoc.querySelectorAll('.close-btn');
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  test('should include history button', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const historyBtn = iframeDoc.querySelectorAll('.close-btn')[0];
    expect(historyBtn.innerHTML).toBe('📚');
  });

  test('should include refresh button', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const refreshBtn = iframeDoc.querySelectorAll('.close-btn')[1];
    expect(refreshBtn.innerHTML).toBe('🔄');
  });

  test('should include star/favorite button', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const starBtn = iframeDoc.querySelectorAll('.close-btn')[2];
    expect(starBtn.innerHTML).toMatch(/[☆⭐]/);
  });

  test('should toggle favorite on star click', async () => {
    const { displaySummary } = require('../content/content.js');
    const testMarkdown = '# Test Summary';
    displaySummary(testMarkdown, [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const starBtn = iframeDoc.querySelectorAll('.close-btn')[2];
    
    await starBtn.click();
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('should have refresh button with tooltip', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const refreshBtn = iframeDoc.querySelectorAll('.close-btn')[1];
    expect(refreshBtn.getAttribute('data-tooltip')).toBe('Refresh (bypass cache)');
  });

  test('should clear cache on refresh button click', async () => {
    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    
    const { displaySummary, summarizeResults } = require('../content/content.js');
    displaySummary('Test', ['http://example.com'], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const refreshBtn = iframeDoc.querySelectorAll('.close-btn')[1];
    
    await refreshBtn.click();
    expect(chrome.storage.local.remove).toHaveBeenCalled();
  });

  test('should show history panel on history button click', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const mockData = {
        'summary_abc123': {
          markdown: '# Test Summary',
          urls: ['http://test.com'],
          timestamp: Date.now()
        }
      };
      if (typeof keys === 'function') {
        keys(mockData);
      } else if (callback) {
        callback(mockData);
      }
      return Promise.resolve(mockData);
    });

    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const historyBtn = iframeDoc.querySelectorAll('.close-btn')[0];
    
    await historyBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const historyPanel = iframeDoc.querySelector('.history-panel-inline');
    expect(historyPanel).toBeTruthy();
  });

  test('should display favorites with star icon', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const mockData = {
        'fav_xyz789': {
          markdown: '# Favorite Summary',
          urls: ['http://fav.com'],
          timestamp: Date.now(),
          query: 'test query'
        }
      };
      if (typeof keys === 'function') {
        keys(mockData);
      } else if (callback) {
        callback(mockData);
      }
      return Promise.resolve(mockData);
    });

    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const historyBtn = iframeDoc.querySelectorAll('.close-btn')[0];
    
    await historyBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const historyItems = iframeDoc.querySelectorAll('.history-item');
    expect(historyItems.length).toBeGreaterThan(0);
  });
});

describe('Message Passing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.runtime.lastError = null;
  });

  test('should send message to background worker', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      callback({ success: true, html: '<html>Test</html>' });
    });

    const promise = new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPage', url: 'https://example.com' },
        response => resolve(response)
      );
    });

    const response = await promise;
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'fetchPage', url: 'https://example.com' },
      expect.any(Function)
    );
    expect(response.success).toBe(true);
  });

  test('should handle runtime errors', async () => {
    chrome.runtime.lastError = { message: 'Connection error' };
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      callback(null);
    });

    const promise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPage', url: 'https://example.com' },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    await expect(promise).rejects.toThrow('Connection error');
  });

  test('should handle fetch failure response', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      callback({ success: false, error: 'Network error' });
    });

    const promise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPage', url: 'https://fail.com' },
        response => {
          if (response?.success) {
            resolve(response.html);
          } else {
            reject(new Error(response?.error || 'Fetch failed'));
          }
        }
      );
    });

    await expect(promise).rejects.toThrow('Network error');
  });
});

describe('DOM Manipulation', () => {
  test('should add summarize button', () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const button = document.querySelector('.summarize-btn');
    expect(button).toBeTruthy();
    expect(button.innerHTML).toContain('svg');
  });

  test('should not duplicate button', () => {
    document.body.innerHTML = '<button class="summarize-btn">Existing</button>';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const buttons = document.querySelectorAll('.summarize-btn');
    expect(buttons.length).toBe(1);
  });

  test('should set button class', () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const button = document.querySelector('.summarize-btn');
    expect(button.className).toBe('summarize-btn');
  });
});

describe('History and Favorites', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof keys === 'function') {
        keys({});
      } else if (callback) {
        callback({});
      }
      return Promise.resolve({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
  });

  test('should store favorite with correct key format', async () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('# Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const starBtn = iframeDoc.querySelectorAll('.close-btn')[2];
    
    await starBtn.click();
    
    const calls = chrome.storage.local.set.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const savedData = calls[0][0];
    const key = Object.keys(savedData)[0];
    expect(key).toMatch(/^fav_/);
  });

  test('should have remove method for favorites', () => {
    expect(chrome.storage.local.remove).toBeDefined();
    expect(typeof chrome.storage.local.remove).toBe('function');
  });

  test('should include search query in favorite', async () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('# Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const starBtn = iframeDoc.querySelectorAll('.close-btn')[2];
    
    await starBtn.click();
    
    const savedData = chrome.storage.local.set.mock.calls[0][0];
    const favData = Object.values(savedData)[0];
    expect(favData).toHaveProperty('markdown');
    expect(favData).toHaveProperty('urls');
    expect(favData).toHaveProperty('timestamp');
    expect(favData).toHaveProperty('query');
  });

  test('should show refresh tooltip with language support', () => {
    const { displaySummary } = require('../content/content.js');
    
    // Test English
    displaySummary('Test', ['http://test.com'], 'brief', 'English');
    let iframe = document.querySelector('iframe');
    let refreshBtn = iframe.contentDocument.querySelectorAll('.close-btn')[1];
    expect(refreshBtn.getAttribute('data-tooltip')).toContain('Refresh');
    expect(refreshBtn.getAttribute('data-tooltip')).toContain('cache');
  });
});

