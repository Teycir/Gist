module.exports = {
  testDir: './tests/browser',
  timeout: 30000,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
};
