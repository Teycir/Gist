/**
 * @jest-environment jsdom
 */

describe('Summarize Results', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window.open = jest.fn();
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
  });

  test('should open popup when no API key', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') callback({ tabId: 123 });
      else if (callback) callback();
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'openPopup' });
  });

  test('should open popup when API key missing', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key' });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') callback({ tabId: 123 });
      else if (callback) callback();
    });

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'openPopup' });
  });

  test('should handle no search results', async () => {
    chrome.storage.local.get.mockResolvedValue({ openrouterApiKey: 'test-key', selectedModel: 'meta-llama/llama-3.2-3b-instruct:free' });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.action === 'getTabId') callback({ tabId: 123 });
    });
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"></div>';

    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();

    expect(global.alert).toHaveBeenCalledWith('No search results found to summarize.');
  });
});
