/**
 * Multi-Engine Search Support Tests
 */

const { JSDOM } = require('jsdom');

describe('Multi-Engine Search Support', () => {
  let detectSearchEngine, scrapeUrls;
  
  beforeEach(() => {
    const contentModule = require('../content/content.js');
    detectSearchEngine = contentModule.detectSearchEngine;
    scrapeUrls = contentModule.scrapeUrls;
  });

  describe('detectSearchEngine', () => {
    test('detects Google', () => {
      global.window = { location: { hostname: 'www.google.com' } };
      expect(detectSearchEngine()).toBe('google');
    });

    test('detects Bing', () => {
      global.window = { location: { hostname: 'www.bing.com' } };
      expect(detectSearchEngine()).toBe('bing');
    });

    test('detects DuckDuckGo', () => {
      global.window = { location: { hostname: 'duckduckgo.com' } };
      expect(detectSearchEngine()).toBe('duckduckgo');
    });

    test('returns null for unknown engine', () => {
      global.window = { location: { hostname: 'example.com' } };
      expect(detectSearchEngine()).toBeNull();
    });
  });

  describe('scrapeUrls - Bing', () => {
    test('extracts URLs from Bing search results', () => {
      const html = `
        <div id="b_results">
          <li class="b_algo">
            <h2><a href="https://example.com/page1">Result 1</a></h2>
          </li>
          <li class="b_algo">
            <h2><a href="https://example.com/page2">Result 2</a></h2>
          </li>
          <li class="b_algo">
            <h2><a href="https://example.com/page3">Result 3</a></h2>
          </li>
        </div>
      `;
      
      const dom = new JSDOM(html);
      global.document = dom.window.document;
      global.window = { location: { hostname: 'www.bing.com' } };
      
      const urls = scrapeUrls();
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/page1');
    });
  });

  describe('scrapeUrls - DuckDuckGo', () => {
    test('extracts URLs from DuckDuckGo search results', () => {
      const html = `
        <div>
          <article data-testid="result">
            <a href="https://example.com/page1">Result 1</a>
          </article>
          <article data-testid="result">
            <a href="https://example.com/page2">Result 2</a>
          </article>
          <article data-testid="result">
            <a href="https://example.com/page3">Result 3</a>
          </article>
        </div>
      `;
      
      const dom = new JSDOM(html);
      global.document = dom.window.document;
      global.window = { location: { hostname: 'duckduckgo.com' } };
      
      const urls = scrapeUrls();
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/page1');
    });
  });
});
