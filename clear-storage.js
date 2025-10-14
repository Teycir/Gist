// Run this in the browser console on the extension's popup page
// Or add a button in popup.html to clear storage

chrome.storage.local.remove([
  'openrouterPrimaryModel',
  'openrouterFallbackModels',
  'primaryModel',
  'fallbackModels',
  'selectedModel'
], () => {
  console.log('✅ Cached models cleared! Reload the extension and save settings again.');
});
