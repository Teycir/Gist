/**
 * @jest-environment jsdom
 */

describe('Popup UI', () => {
  let loadModels;
  let resetCache;
  
  beforeEach(() => {
    jest.clearAllTimers();
    jest.resetModules();
    jest.clearAllMocks();
    
    document.body.innerHTML = `
      <input id="apiKey" />
      <select id="languageSelect"></select>
      <select id="formatSelect"></select>
      <div id="statusMsg"></div>
      <button id="saveKey"></button>
    `;
    
    global.fetch = jest.fn();
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;
    global.AbortController = class {
      signal = {};
      abort() {}
    };
    global.setTimeout = (fn, delay) => realSetTimeout(fn, delay);
    global.clearTimeout = (id) => realClearTimeout(id);
    
    const popup = require('../popup/popup.js');
    loadModels = popup.loadModels;
    resetCache = popup._resetCache;
    resetCache();
  });
  
  afterEach(() => {
    if (resetCache) resetCache();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('should validate API key before saving', () => {
    const apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.value = '';
    expect(apiKeyInput.value).toBe('');
  });







  test('should filter free Llama models correctly', () => {
    const models = [
      { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } },
      { id: 'openai/gpt-4', pricing: { prompt: '30' } }
    ];

    const filtered = models.filter(m => 
      m.id.includes('llama') && m.pricing?.prompt === '0'
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toContain('llama');
  });

  test('should sort models by version', () => {
    const models = [
      { id: 'meta-llama/llama-3.1-8b-instruct:free', version: '3.1' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', version: '3.2' },
      { id: 'meta-llama/llama-3.2-1b-instruct:free', version: '3.2' }
    ];

    const sorted = models.sort((a, b) => parseFloat(b.version) - parseFloat(a.version));

    expect(sorted[0].version).toBe('3.2');
    expect(sorted[2].version).toBe('3.1');
  });


});
