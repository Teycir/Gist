# Clear Extension Cache

The DeepSeek R1 model is still cached. To clear it:

## Method 1: Browser Console
1. Right-click the extension icon → Inspect Popup
2. Go to Console tab
3. Run this command:
```javascript
chrome.storage.local.remove(['openrouterPrimaryModel', 'openrouterFallbackModels'], () => {
  console.log('✅ Cache cleared! Close this and click Save Settings in popup.');
});
```

## Method 2: Extension Storage
1. Go to `chrome://extensions/`
2. Find "Gist" extension
3. Click "Details"
4. Scroll down and click "Clear storage"
5. Reload the extension
6. Open popup and click "Save Settings"

## Verify
After clearing, the console should show:
```
Saved models: { primary: 'meta-llama/llama-4-scout:free', fallbacks: [...] }
```

Not:
```
primary: 'deepseek/deepseek-r1-distill-llama-70b:free'
```
