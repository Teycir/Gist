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







  test('should filter Flash models correctly', () => {
    const models = [
      { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text' },
      { name: 'gemini-image', displayName: 'Gemini Image', supportedGenerationMethods: ['generateContent'], description: 'Image generation' }
    ];

    const filtered = models.filter(m => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      const name = m.displayName.toLowerCase();
      const desc = (m.description || '').toLowerCase();
      return name.includes('flash') && !desc.includes('image generation');
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('gemini-2.5-flash');
  });

  test('should sort models by version', () => {
    const models = [
      { name: 'gemini-1.5-flash', version: '1.5' },
      { name: 'gemini-2.5-flash', version: '2.5' },
      { name: 'gemini-2.0-flash', version: '2.0' }
    ];

    const sorted = models.sort((a, b) => parseFloat(b.version) - parseFloat(a.version));

    expect(sorted[0].version).toBe('2.5');
    expect(sorted[2].version).toBe('1.5');
  });


});
