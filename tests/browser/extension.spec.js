const { test, expect, chromium, firefox } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../..');

test.describe('Chromium Extension', () => {
  test('should load Chromium browser', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    expect(await page.title()).toContain('Google');
    await browser.close();
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
