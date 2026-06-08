const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

describe('OpenRouter API Integration', () => {
  test('should fetch models successfully', async () => {
    if (!OPENROUTER_API_KEY) {
      console.log('⏭️  Skipping: No OpenRouter API key');
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }
    });
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('should generate content successfully', async () => {
    if (!OPENROUTER_API_KEY) {
      console.log('⏭️  Skipping: No OpenRouter API key');
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 100
      })
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    expect(response.ok).toBe(true);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
  }, 10000);

  test('should handle API errors gracefully', async () => {
    if (!OPENROUTER_API_KEY) {
      console.log('⏭️  Skipping: No OpenRouter API key');
      return;
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'Test' }]
      })
    });

    expect(response.ok).toBe(false);
    const error = await response.json();
    expect(error.error).toBeDefined();
  });
});

describe('Model Filtering', () => {
  test('should filter free Llama models correctly', () => {
    const models = [
      { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0', completion: '0' } },
      { id: 'meta-llama/llama-3.2-1b-instruct:free', pricing: { prompt: '0', completion: '0' } },
      { id: 'openai/gpt-4', pricing: { prompt: '30', completion: '60' } }
    ];

    const filtered = models.filter(m => 
      m.id.includes('llama') && 
      m.pricing?.prompt === '0'
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toContain('llama');
    expect(filtered[0].pricing.prompt).toBe('0');
  });
});
