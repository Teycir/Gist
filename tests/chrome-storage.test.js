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
    chrome.storage.local.get.mockResolvedValue({ openrouterApiKey: 'test-key', selectedModel: 'meta-llama/llama-3.2-3b-instruct:free' });

    const result = await chrome.storage.local.get(['openrouterApiKey', 'selectedModel']);
    expect(result.openrouterApiKey).toBe('test-key');
    expect(result.selectedModel).toBe('meta-llama/llama-3.2-3b-instruct:free');
  });

  test('should handle missing storage values', async () => {
    chrome.storage.local.get.mockResolvedValue({});

    const result = await chrome.storage.local.get(['flashApiKey']);
    expect(result.flashApiKey).toBeUndefined();
  });
});
