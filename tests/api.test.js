const { API_KEY, MODEL } = require('./config');

describe('Google AI API Integration', () => {
  test('should fetch models successfully', async () => {
    if (!API_KEY) {
      console.log('⏭️  Skipping: No API key');
      return;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.models).toBeDefined();
    expect(data.models.length).toBeGreaterThan(0);
  });

  test('should generate content successfully', async () => {
    if (!API_KEY) {
      console.log('⏭️  Skipping: No API key');
      return;
    }

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
  }, 10000);

  test('should handle API errors gracefully', async () => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=invalid`
    );

    expect(response.ok).toBe(false);
    try {
      const error = await response.json();
      expect(error.error).toBeDefined();
    } catch (e) {
      // Empty response body is also a valid error case
      expect(response.ok).toBe(false);
    }
  });
});

describe('Model Filtering', () => {
  test('should filter Flash models correctly', () => {
    const models = [
      { name: 'gemini-2.0-pro', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'], description: 'Text model' },
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
