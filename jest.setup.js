global.fetch = require('node-fetch');

// Suppress JSDOM navigation errors
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Not implemented: navigation')) return;
  originalError(...args);
};

// Load .env file
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}
