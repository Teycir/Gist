const { test, expect, chromium, firefox } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../dist');

test.describe('Chromium Extension', () => {
  test('should load Chromium browser', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    expect(await page.title()).toContain('Google');
    await browser.close();
  });

  test('should load extension with background worker', async () => {
    const context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    const page = await context.newPage();
    await page.goto('https://www.google.com/search?q=test');
    
    const button = await page.waitForSelector('.summarize-btn', { timeout: 5000 }).catch(() => null);
    expect(button).toBeTruthy();
    
    await context.close();
  });
});

test.describe('Firefox Extension', () => {
  test('should load Firefox browser', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    expect(await page.title()).toContain('Google');
    await browser.close();
  });
});

test.describe('Background Worker Integration', () => {
  test('should handle message passing', async () => {
    const context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    
    const page = await context.newPage();
    await page.goto('https://www.google.com/search?q=test');
    
    const hasBackgroundWorker = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'fetchPage', url: 'https://example.com' },
          response => resolve(!!response)
        );
      });
    }).catch(() => false);
    
    expect(hasBackgroundWorker).toBeTruthy();
    await context.close();
  });
});
