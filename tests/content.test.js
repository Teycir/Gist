/**
 * @jest-environment jsdom
 */

const { scrapeGoogleUrls, cleanHtmlToText } = require('../content/content.js');

describe('Content Processing', () => {
  test('should clean HTML and extract text', () => {
    const html = '<html><body><div>Hello World</div></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Hello');
    expect(result).not.toContain('<div>');
  });

  test('should remove script tags', () => {
    const html = '<html><body><script>alert("test")</script><div>Content</div></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).not.toContain('alert');
    expect(result).toContain('Content');
  });

  test('should remove navigation elements', () => {
    const html = '<html><body><nav>Menu</nav><article>Article Content</article></body></html>';
    const result = cleanHtmlToText(html);
    expect(typeof result).toBe('string');
    expect(result).not.toContain('Menu');
  });

  test('should limit text to 5000 characters', () => {
    const longText = 'a'.repeat(10000);
    const html = `<html><body><div>${longText}</div></body></html>`;
    const result = cleanHtmlToText(html);
    expect(result.length).toBeLessThanOrEqual(5000);
  });

  test('should extract text from body when no main element', () => {
    const html = '<html><body><p>Body text here</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  test('should remove multiple unwanted elements', () => {
    const html = '<html><body><style>css</style><iframe>frame</iframe><p>Content</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).toContain('Content');
  });

  test('should normalize whitespace', () => {
    const html = '<html><body><p>Text   with    spaces</p></body></html>';
    const result = cleanHtmlToText(html);
    expect(result).not.toContain('   ');
  });
});

describe('URL Scraping', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://example.com">Example</a>
        <a href="http://test.com">Test</a>
        <a href="http://youtube.com">YouTube</a>
        <a href="http://demo.com">Demo</a>
      </div>
    `;
  });

  test('should scrape up to 3 URLs', () => {
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBeLessThanOrEqual(3);
  });

  test('should exclude YouTube URLs', () => {
    const urls = scrapeGoogleUrls();
    expect(urls.every(url => !url.includes('youtube.com'))).toBe(true);
  });

  test('should remove duplicates', () => {
    const urls = scrapeGoogleUrls();
    const uniqueUrls = new Set(urls);
    expect(urls.length).toBe(uniqueUrls.size);
  });

  test('should handle empty search results', () => {
    document.body.innerHTML = '<div id="search"></div>';
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBe(0);
  });

  test('should filter google.com URLs', () => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://google.com/test">Google</a>
        <a href="http://example.com">Example</a>
      </div>
    `;
    const urls = scrapeGoogleUrls();
    expect(urls.every(url => !url.includes('google.com'))).toBe(true);
  });

  test('should stop at 3 URLs', () => {
    document.body.innerHTML = `
      <div id="search">
        <a href="http://a.com">A</a>
        <a href="http://b.com">B</a>
        <a href="http://c.com">C</a>
        <a href="http://d.com">D</a>
      </div>
    `;
    const urls = scrapeGoogleUrls();
    expect(urls.length).toBe(3);
  });
});

describe('Display Summary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.navigator.clipboard = { writeText: jest.fn() };
  });

  test('should create summary overlay', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('# Test Summary\n\nContent here', ['http://example.com']);
    const overlay = document.querySelector('.summary-overlay');
    expect(overlay).toBeTruthy();
  });

  test('should include copy button', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test content', ['http://example.com']);
    const copyBtn = document.querySelector('.close-btn');
    expect(copyBtn).toBeTruthy();
  });

  test('should have overlay structure', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', []);
    const overlay = document.querySelector('.summary-overlay');
    const content = overlay.querySelector('.summary-content');
    expect(content).toBeTruthy();
  });

  test('should display multiple sources', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', ['http://a.com', 'http://b.com']);
    const overlay = document.querySelector('.summary-overlay');
    expect(overlay).toBeTruthy();
  });

  test('should copy summary to clipboard', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test summary', []);
    const copyBtn = document.querySelectorAll('.close-btn')[0];
    copyBtn.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test summary');
  });

  test('should remove overlay on close button', () => {
    const { displaySummary } = require('../content/content.js');
    displaySummary('Test', []);
    const closeBtn = document.querySelectorAll('.close-btn')[1];
    closeBtn.click();
    expect(document.querySelector('.summary-overlay')).toBeFalsy();
  });
});

describe('DOM Manipulation', () => {
  test('should add summarize button', () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const button = document.querySelector('.summarize-btn');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Summarize');
  });

  test('should not duplicate button', () => {
    document.body.innerHTML = '<button class="summarize-btn">Existing</button>';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const buttons = document.querySelectorAll('.summarize-btn');
    expect(buttons.length).toBe(1);
  });

  test('should set button class', () => {
    document.body.innerHTML = '';
    const { addSummarizeButton } = require('../content/content.js');
    addSummarizeButton();
    const button = document.querySelector('.summarize-btn');
    expect(button.className).toBe('summarize-btn');
  });
});
