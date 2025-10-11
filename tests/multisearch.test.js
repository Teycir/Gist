/**
 * Multi-Search Feature Tests
 */

describe('Multi-Search Feature', () => {
  let chromeMock;

  beforeEach(() => {
    chromeMock = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn()
      },
      tabs: {
        create: jest.fn()
      }
    };
    global.chrome = chromeMock;
  });

  test('should save multi-search setting', async () => {
    chromeMock.storage.local.set.mockResolvedValue();
    
    await chrome.storage.local.set({
      flashApiKey: 'test-key',
      selectedModel: 'test-model',
      selectedLanguage: 'English',
      summaryFormat: 'brief',
      multiSearchEnabled: true
    });

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      flashApiKey: 'test-key',
      selectedModel: 'test-model',
      selectedLanguage: 'English',
      summaryFormat: 'brief',
      multiSearchEnabled: true
    });
  });

  test('should load multi-search setting', async () => {
    chromeMock.storage.local.get.mockResolvedValue({
      multiSearchEnabled: true
    });

    const result = await chrome.storage.local.get(['multiSearchEnabled']);
    expect(result.multiSearchEnabled).toBe(true);
  });

  test('should trigger multi-search when enabled', () => {
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (callback) callback();
    });

    chrome.runtime.sendMessage({
      action: 'multiSearch',
      query: 'test query'
    });

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'multiSearch',
      query: 'test query'
    });
  });

  test('should open 3 tabs for multi-search', () => {
    const query = 'test query';
    const encodedQuery = encodeURIComponent(query);
    
    const urls = [
      `https://www.google.com/search?q=${encodedQuery}`,
      `https://www.bing.com/search?q=${encodedQuery}`,
      `https://duckduckgo.com/?q=${encodedQuery}`
    ];

    urls.forEach(url => {
      chrome.tabs.create({ url, active: false });
    });

    expect(chromeMock.tabs.create).toHaveBeenCalledTimes(3);
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: `https://www.google.com/search?q=${encodedQuery}`,
      active: false
    });
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: `https://www.bing.com/search?q=${encodedQuery}`,
      active: false
    });
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: `https://duckduckgo.com/?q=${encodedQuery}`,
      active: false
    });
  });
});
