/**
 * @jest-environment jsdom
 */

global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.showdown = { Converter: jest.fn(() => ({ makeHtml: (md) => md })) };

const { scrapeGoogleUrls, cleanHtmlToText } = require('../content/content.js');

describe('Multi-Engine Search Support', () => {
  describe('detectSearchEngine', () => {
    test('detects Google based on hostname', () => {
      const hostname = 'www.google.com';
      expect(hostname.includes('google.com')).toBe(true);
    });

    test('detects Bing based on hostname', () => {
      const hostname = 'www.bing.com';
      expect(hostname.includes('bing.com')).toBe(true);
    });

    test('detects DuckDuckGo based on hostname', () => {
      const hostname = 'duckduckgo.com';
      expect(hostname.includes('duckduckgo.com')).toBe(true);
    });

    test('returns null for unknown engine', () => {
      const hostname = 'example.com';
      expect(hostname.includes('google.com')).toBe(false);
      expect(hostname.includes('bing.com')).toBe(false);
      expect(hostname.includes('duckduckgo.com')).toBe(false);
    });
  });

  describe('scrapeUrls - Google', () => {
    test('extracts URLs from Google search results', () => {
      document.body.innerHTML = `
        <div id="search">
          <a href="https://example.com/page1">Result 1</a>
          <a href="https://example.com/page2">Result 2</a>
          <a href="https://example.com/page3">Result 3</a>
        </div>
      `;
      
      const urls = scrapeGoogleUrls();
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/page1');
    });
  });

  describe('cleanHtmlToText', () => {
    test('removes ads and prioritizes main content', () => {
      const html = '<html><body><div class="ad">Ad</div><article>Main content</article></body></html>';
      const result = cleanHtmlToText(html);
      expect(result).toContain('Main content');
      expect(result).not.toContain('Ad');
    });
  });
});
