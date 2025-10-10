const { API_KEY, MODEL } = require('./config');

describe('Google AI API Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should fetch models successfully', async () => {
    const mockResponse = {
      models: [
        { 
          name: 'models/gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          supportedGenerationMethods: ['generateContent']
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.models).toBeDefined();
    expect(data.models.length).toBeGreaterThan(0);
  });

  test('should generate content successfully', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Test summary' }]
        }
      }]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test prompt' }] }]
        })
      }
    );

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    expect(response.ok).toBe(true);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
  });

  test('should handle API errors gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Invalid API key' } })
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=invalid`
    );

    expect(response.ok).toBe(false);
    const error = await response.json();
    expect(error.error).toBeDefined();
  });

  test('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
    ).rejects.toThrow('Network error');
  });
});

describe('Model Filtering', () => {
  test('should filter Flash models correctly', () => {
    const models = [
      { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text model' },
      { name: 'gemini-image', displayName: 'Gemini Image', supportedGenerationMethods: ['generateContent'], description: 'Image generation' },
      { name: 'gemini-pro', displayName: 'Gemini Pro', supportedGenerationMethods: ['generateContent'], description: 'Pro model' }
    ];

    const filtered = models.filter(m => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      const name = m.displayName.toLowerCase();
      const desc = (m.description || '').toLowerCase();
      return name.includes('flash') && 
             !name.includes('image') && 
             !desc.includes('image generation');
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].displayName).toBe('Gemini 2.5 Flash');
  });
});
