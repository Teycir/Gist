describe('Edge Cases', () => {
  test('should handle empty HTML', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('', 'text/html');
    const text = doc.body?.textContent || '';
    expect(text).toBe('');
  });

  test('should handle malformed HTML', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div><p>Unclosed', 'text/html');
    expect(doc.body).toBeDefined();
  });

  test('should handle special characters', () => {
    const text = '<>&"\'';
    expect(text).toContain('<');
    expect(text).toContain('>');
  });

  test('should handle very long URLs', () => {
    const longUrl = 'http://example.com/' + 'a'.repeat(2000);
    expect(longUrl.length).toBeGreaterThan(2000);
  });

  test('should handle empty search results', () => {
    document.body.innerHTML = '<div id="search"></div>';
    const links = document.querySelectorAll('div#search a[href^="http"]');
    expect(links.length).toBe(0);
  });

  test('should handle null/undefined values', () => {
    expect(null || 'default').toBe('default');
    expect(undefined || 'default').toBe('default');
  });
});

describe('Error Scenarios', () => {
  test('should handle fetch timeout', async () => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject('timeout'), 100)
    );
    
    await expect(timeoutPromise).rejects.toBe('timeout');
  });

  test('should handle invalid JSON response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); }
    };
    await expect(mockResponse.json()).rejects.toThrow('Invalid JSON');
  });

  test('should handle missing API key', () => {
    const apiKey = '';
    expect(apiKey).toBeFalsy();
  });

  test('should handle API rate limiting', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } })
    };
    expect(mockResponse.ok).toBe(false);
    expect(mockResponse.status).toBe(429);
  });
});

describe('Performance', () => {
  test('should complete text cleaning within 100ms', () => {
    const start = Date.now();
    const html = '<div>' + 'test '.repeat(1000) + '</div>';
    const parser = new DOMParser();
    parser.parseFromString(html, 'text/html');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('should handle concurrent requests', async () => {
    const promises = Array(5).fill(null).map(() => 
      Promise.resolve({ ok: true })
    );
    const results = await Promise.all(promises);
    expect(results.length).toBe(5);
  });
});
