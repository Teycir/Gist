# Cross-Platform Search Engine Support

## Overview
Gist now supports **Google, Bing, and DuckDuckGo** search engines, dramatically expanding the user base and providing choice in search providers.

## Implementation

### 1. Manifest Updates (`manifest.json`)
Added content script patterns for all supported engines:
```json
"matches": [
  "https://www.google.com/search*",
  "https://www.bing.com/search*",
  "https://duckduckgo.com/*"
]
```

### 2. Engine Detection (`content.js`)
New `detectSearchEngine()` function identifies the current search engine:
```javascript
function detectSearchEngine() {
  const hostname = window.location.hostname;
  if (hostname.includes('google.com')) return 'google';
  if (hostname.includes('bing.com')) return 'bing';
  if (hostname.includes('duckduckgo.com')) return 'duckduckgo';
  return null;
}
```

### 3. Unified URL Scraping
New `scrapeUrls()` function with engine-specific selectors:

| Engine | DOM Selector |
|--------|-------------|
| Google | `div#search a[href^="http"]:not([href*="google.com"])` |
| Bing | `#b_results .b_algo h2 a[href^="http"]` |
| DuckDuckGo | `article[data-testid="result"] a[href^="http"]` |

### 4. Query Extraction
Updated `extractSearchQuery()` to handle all engines (all use `?q=` parameter).

## Testing
Run tests with:
```bash
npm test tests/multi-engine.test.js
```

## Usage
1. Navigate to any supported search engine
2. Perform a search
3. Click the "✨ Summarize with AI" button
4. Get instant AI-powered summaries

## Benefits
- **3x larger potential user base** (Google + Bing + DuckDuckGo users)
- **User choice** in search providers
- **Privacy-focused option** with DuckDuckGo
- **Same great features** across all engines

## Future Enhancements
- Yahoo Search support
- Brave Search support
- Ecosia support
- Custom search engine configuration
