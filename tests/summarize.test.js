/**
 * @jest-environment jsdom
 */

describe('Summarize Results', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    fetch.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window.open = jest.fn();
  });

  test('should open popup when no API key', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (callback) callback();
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'openPopup' });
  });

  test('should open popup when API key missing', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key' });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (callback) callback();
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'openPopup' });
  });

  test('should handle no search results', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key', selectedModel: 'models/gemini-1.5-flash' });
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"></div>';

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(global.alert).toHaveBeenCalledWith('No search results found to summarize.');
  });

  test('should use default settings', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const data = { flashApiKey: 'AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' };
      if (callback) callback(data);
      return Promise.resolve(data);
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      setTimeout(() => callback({ success: true, html: '<html><body><main>Content here with enough text</main></body></html>' }), 0);
    });
    
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="https://test.com">Test</a></div>';
    
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Summary' }] } }] }) });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<html><body><main>Content here with enough text</main></body></html>') });
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });
});
