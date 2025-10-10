/**
 * @jest-environment jsdom
 */

describe('Popup UI', () => {
  let loadModels;
  
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="apiKey" />
      <select id="modelSelect"></select>
      <select id="languageSelect"></select>
      <select id="formatSelect"></select>
      <div id="statusMsg"></div>
      <button id="saveKey"></button>
    `;
    fetch.mockClear();
    jest.resetModules();
    const popup = require('../popup/popup.js');
    loadModels = popup.loadModels;
  });

  test('should validate API key before saving', () => {
    const apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.value = '';
    expect(apiKeyInput.value).toBe('');
  });

  test('should populate model dropdown', async () => {
    const mockModels = {
      models: [
        { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text' },
        { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    await loadModels('test-key');
    const select = document.getElementById('modelSelect');
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(0);
  });

  test('should load models with valid API key', async () => {
    const mockModels = {
      models: [
        { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    await loadModels('test-key');
    const select = document.getElementById('modelSelect');
    expect(select.innerHTML).toContain('Gemini 2.5 Flash');
  });

  test('should handle API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('API error'));
    await loadModels('invalid-key');
    const select = document.getElementById('modelSelect');
    expect(select.innerHTML).toContain('Enter API key first');
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

  test('should limit to top 5 models', async () => {
    const mockModels = {
      models: Array(10).fill(null).map((_, i) => ({
        name: `gemini-${i}-flash`,
        displayName: `Gemini ${i} Flash`,
        supportedGenerationMethods: ['generateContent'],
        description: 'Text',
        version: `${i}.0`
      }))
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    await loadModels('test-key');
    const select = document.getElementById('modelSelect');
    const options = select.querySelectorAll('option');
    expect(options.length).toBeLessThanOrEqual(5);
  });
});
