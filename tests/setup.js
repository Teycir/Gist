// Test environment setup
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  }
};

global.fetch = jest.fn();

// Mock window.location to avoid jsdom navigation warnings
delete global.window.location;
global.window.location = {
  href: 'https://www.google.com/search?q=test',
  search: '?q=test',
  pathname: '/search',
  origin: 'https://www.google.com',
  protocol: 'https:',
  host: 'www.google.com'
};
