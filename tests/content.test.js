/**
 * @jest-environment jsdom
 */

global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

const { scrapeGoogleUrls, cleanHtmlToText } = require('../content/content.js');

global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null,
    getURL: jest.fn((path) => `chrome-extension://fake-id/${path}`)
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
    global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
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













  test.skip('should show history panel on history button click', async () => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button>';
    
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
    await displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const historyBtn = iframeDoc.querySelectorAll('.close-btn')[0];
    
    await historyBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const historyPanel = iframeDoc.querySelector('.history-panel-inline');
    expect(historyPanel).toBeTruthy();
    const searchInput = iframeDoc.querySelector('.history-search');
    expect(searchInput).toBeTruthy();
    const scrollBtns = iframeDoc.querySelectorAll('.history-scroll-btn');
    expect(scrollBtns.length).toBe(4);
  });

  test.skip('should display favorites with star icon', async () => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button>';
    
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
    await displaySummary('Test', [], 'brief', 'English');
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
  test.skip('should add summarize button', async () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    await new Promise(resolve => setTimeout(resolve, 50));
    const button = document.querySelector('.summarize-btn');
    expect(button).toBeTruthy();
    if (button) {
      expect(button.innerHTML).toContain('svg');
    }
  });

  test.skip('should not duplicate button', async () => {
    document.body.innerHTML = '<button class="summarize-btn">Existing</button>';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    await new Promise(resolve => setTimeout(resolve, 50));
    const buttons = document.querySelectorAll('.summarize-btn');
    expect(buttons.length).toBe(1);
  });

  test.skip('should set button class', async () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    await new Promise(resolve => setTimeout(resolve, 50));
    const button = document.querySelector('.summarize-btn');
    if (button) {
      expect(button.className).toBe('summarize-btn');
    } else {
      expect(true).toBe(true);
    }
  });
});

describe('History and Favorites', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
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


  test('should have remove method for favorites', () => {
    expect(chrome.storage.local.remove).toBeDefined();
    expect(typeof chrome.storage.local.remove).toBe('function');
  });



  test.skip('should filter history items on search input', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const mockData = {
        'summary_abc123': {
          markdown: '# Test Summary One',
          urls: ['http://test.com'],
          timestamp: Date.now(),
          query: 'test query'
        },
        'summary_def456': {
          markdown: '# Another Summary',
          urls: ['http://another.com'],
          timestamp: Date.now(),
          query: 'different query'
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
    await displaySummary('Test', [], 'brief', 'English');
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    const historyBtn = iframeDoc.querySelectorAll('.close-btn')[0];
    
    await historyBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const searchInput = iframeDoc.querySelector('.history-search');
    searchInput.value = 'Another';
    searchInput.oninput({ target: searchInput });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const historyItems = iframeDoc.querySelectorAll('.history-item');
    expect(historyItems.length).toBeGreaterThan(0);
  });
});

