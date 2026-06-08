// Test environment setup
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

global.fetch = jest.fn();

// Load model-selector functions so window.selectBestModels is available in content.js tests
const { selectBestModels, selectBestGeminiModels } = require('../lib/model-selector.js');
global.window = global.window || {};
global.window.selectBestModels = selectBestModels;
global.window.selectBestGeminiModels = selectBestGeminiModels;

// Mock window.location to avoid jsdom navigation warnings
if (global.window && !global.window.location) {
  global.window.location = {
    href: 'https://www.google.com/search?q=test',
    search: '?q=test',
    pathname: '/search',
    origin: 'https://www.google.com',
    protocol: 'https:',
    host: 'www.google.com'
  };
}
