const { API_KEY } = require('./config');

describe('Model Selection', () => {
  test('should return top 5 latest Flash models', async () => {
    const mockModels = {
      models: [
        { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', version: '2.5', supportedGenerationMethods: ['generateContent'], description: 'Latest' },
        { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', version: '2.0', supportedGenerationMethods: ['generateContent'], description: 'Older' },
        { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', version: '1.5', supportedGenerationMethods: ['generateContent'], description: 'Old' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    const filtered = data.models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent') &&
      m.displayName.toLowerCase().includes('flash')
    );

    const sorted = filtered.sort((a, b) => {
      const versionA = parseFloat(a.version);
      const versionB = parseFloat(b.version);
      return versionB - versionA;
    });

    const top5 = sorted.slice(0, 5);

    expect(top5.length).toBeLessThanOrEqual(5);
    expect(top5[0].version).toBe('2.5');
  });
});
