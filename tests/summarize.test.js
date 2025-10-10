/**
 * @jest-environment jsdom
 */

describe('Summarize Results', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button>';
    chrome.storage.local.get.mockClear();
    fetch.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window = { open: jest.fn(), location: { search: '?q=test' } };
  });

  test('should alert when no API key', async () => {
    global.confirm.mockReturnValue(false);
    chrome.storage.local.get.mockResolvedValue({});

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(global.confirm).toHaveBeenCalled();
  });

  test('should prompt for API key when missing', async () => {
    global.confirm.mockReturnValue(false);
    chrome.storage.local.get.mockResolvedValue({});

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(global.confirm).toHaveBeenCalled();
  });

  test('should handle no search results', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key' });
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"></div>';

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(global.alert).toHaveBeenCalledWith('No search results found to summarize.');
  });

  test('should use default settings', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key' });
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="http://test.com">Test</a></div>';
    global.window.location.search = '?q=test';
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Summary' }] } }] }) });
      }
      return Promise.resolve({ ok: true, text: async () => '<html><body><main>Content</main></body></html>' });
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(fetch).toHaveBeenCalled();
  });
});
