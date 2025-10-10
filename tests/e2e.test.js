const puppeteer = require('puppeteer');
const path = require('path');

describe('Extension E2E', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${path.resolve(__dirname, '..')}`,
        `--load-extension=${path.resolve(__dirname, '..')}`
      ]
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('should load extension', async () => {
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => target.type() === 'service_worker');
    expect(extensionTarget).toBeDefined();
  });

  test('should inject button on Google search', async () => {
    page = await browser.newPage();
    await page.goto('https://www.google.com/search?q=test', { waitUntil: 'networkidle2' });
    
    const button = await page.$('.summarize-btn');
    expect(button).toBeDefined();
  }, 30000);
});
