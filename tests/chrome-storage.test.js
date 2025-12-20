/**
 * @jest-environment jsdom
 */

describe('Chrome Storage Integration', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test('should save settings to chrome storage', () => {
    chrome.storage.local.set({ flashApiKey: 'test-key' });
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('should retrieve settings from chrome storage', async () => {
    chrome.storage.local.get.mockResolvedValue({ flashApiKey: 'test-key', selectedModel: 'gemini-2.0-pro' });

    const result = await chrome.storage.local.get(['flashApiKey', 'selectedModel']);
    expect(result.flashApiKey).toBe('test-key');
    expect(result.selectedModel).toBe('gemini-2.0-pro');
  });

  test('should handle missing storage values', async () => {
    chrome.storage.local.get.mockResolvedValue({});

    const result = await chrome.storage.local.get(['flashApiKey']);
    expect(result.flashApiKey).toBeUndefined();
  });
});
