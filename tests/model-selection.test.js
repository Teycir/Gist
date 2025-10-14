const { API_KEY } = require('./config');

describe('Model Selection', () => {
  test('should return top 5 latest Flash models', async () => {
    if (!API_KEY) {
      console.log('⏭️  Skipping: No API key');
      return;
    }

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
    expect(top5[0].version).toContain('2.');
    expect(top5.length).toBeGreaterThan(0);
  });
});
