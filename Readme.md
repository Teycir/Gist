# Gist 🚀

## What is Gist?

**Gist** saves you time by instantly summarizing Google search results using AI. Instead of clicking through multiple websites to find answers, get a clear, concise summary of the top results in seconds.

### For Everyone

**The Problem:** When you search on Google, you often need to open 5-10 tabs, read through lengthy articles, and piece together information yourself.

**The Solution:** Gist reads the top search results for you and creates an easy-to-read summary with all the key points and sources.

**How it works:**
1. Search anything on Google (like you normally do)
2. Click the "✨ Summarize with AI" button
3. Get an instant AI summary with references

**Privacy First:** Your API key stays on your computer. No data is sent to our servers because we don't have any servers.

### ✨ Key Features

- 🔑 **Use Your Own AI Key** - Bring your own Google AI API key (free tier available)
- 🔒 **100% Private** - Everything runs in your browser, no external servers
- ⚡ **Lightning Fast** - Optimized caching delivers summaries in under 100ms
- 🎨 **Clean Interface** - Seamlessly integrates with Google Search
- 🌍 **Multi-Language** - Supports 10+ languages including English, Spanish, French, German
- 📝 **Flexible Formats** - Choose between detailed, bullet points, or concise summaries
- ♿ **Accessible** - Full keyboard navigation and screen reader support

## 🎯 Quick Start (3 Steps)

1. **Install Extension**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" → Click "Load unpacked"
   - Select the `dist` folder from this project

2. **Add Your API Key**
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click the Gist icon in Chrome → Enter your key → Save

3. **Start Using**
   - Search on Google → Click "✨ Summarize with AI"
   - Enjoy instant summaries!

---

# For Developers

## 🏗️ Architecture

### Core Principles

- **Client-Side Only** - Zero backend infrastructure
- **Performance First** - Aggressive caching (100ms warm cache, <8s cold start)
- **Privacy by Design** - No data collection, no tracking
- **Minimal Permissions** - Only `storage` permission required

### System Flow

```mermaid
flowchart TD
    A[🔍 User performs Google search] --> B[📌 Extension injects '✨ Summarize with AI' button]
    B --> C[👆 User clicks summarize button]
    C --> D[🔗 Scrape URLs from search results]
    D --> E[📄 Parallel fetch page content]
    E --> F[🧹 Clean HTML to text]
    F --> G{Cache check}
    G -->|Cache hit| H[⚡ Return cached summary]
    G -->|Cache miss| I[🤖 Call Google AI API]
    I --> J[📝 Render markdown response]
    J --> K[📋 Display summary overlay]
    H --> K
```

**Flow Description:**
1. **User Search** - User performs a Google search as normal
2. **Button Injection** - Extension automatically adds summarize button to results
3. **User Click** - User clicks the "✨ Summarize with AI" button
4. **URL Scraping** - Extension extracts URLs from search result links
5. **Content Fetching** - Multiple page contents fetched in parallel
6. **HTML Cleaning** - Raw HTML converted to clean, readable text
7. **Cache Check** - System checks for existing cached summaries
8. **API Call** - If not cached, calls Google AI API with cleaned content
9. **Response Rendering** - AI response converted from markdown to HTML
10. **Summary Display** - Formatted summary shown in overlay with references

### Performance Optimizations

- **Multi-Level Caching**: Summary cache + page content cache
- **Parallel Fetching**: Concurrent page requests with Promise.all
- **Smart Hashing**: Fast cache key generation (< 1ms)
- **Lazy Loading**: On-demand content fetching
- **Memory Management**: Automatic cache cleanup for old entries

## 📁 Project Structure

```
Gist/
├── dist/                      # Production build (deployment ready)
├── content/
│   ├── content.js            # Core logic (summarization, caching, API)
│   └── content.css           # UI styling
├── popup/
│   ├── popup.html            # Settings interface
│   └── popup.js              # Configuration management
├── icons/                     # Extension icons (16, 48, 128px)
├── lib/
│   └── showdown.min.js       # Markdown renderer
├── tests/                     # Comprehensive test suite
│   ├── content.test.js       # Unit tests
│   ├── e2e.test.js           # End-to-end tests
│   ├── performance.test.js   # Performance benchmarks
│   └── browser/              # Playwright browser tests
├── manifest.json             # Extension configuration
└── package.json              # Dependencies and scripts
```

## 🧪 Testing & Quality

### Test Coverage

- **Unit Tests**: 95%+ code coverage
- **Integration Tests**: Full user flows
- **E2E Tests**: Real browser automation with Playwright
- **Performance Tests**: Sub-100ms warm cache, <8s cold start
- **Accessibility Tests**: WCAG 2.1 AA compliant

### Run Tests

```bash
npm test                    # Unit tests
npm run test:coverage       # Coverage report
npm run test:e2e           # Integration tests
npm run test:browser       # Playwright browser tests
```

### CI/CD Pipeline

- GitHub Actions for automated testing
- Pre-commit hooks with Husky
- Coverage reporting
- Browser compatibility checks (Chrome, Firefox, Edge)

## 🔧 Technical Implementation

### Key Technologies

- **Chrome Extension Manifest V3**
- **Google Gemini 1.5 Flash API**
- **Showdown.js** for Markdown rendering
- **Jest** for testing
- **Playwright** for E2E tests

### Core Features Implemented

✅ **Smart Caching System**
- Two-tier cache (summary + page content)
- 24-hour TTL with automatic cleanup
- Hash-based cache keys for fast lookups

✅ **Multi-Language Support**
- English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Japanese, Chinese
- Language-aware prompts
- Automatic language detection

✅ **Flexible Summary Formats**
- Detailed (comprehensive analysis)
- Bullet Points (quick scan)
- Concise (TL;DR style)

✅ **Accessibility Features**
- Full keyboard navigation (Tab, Enter, Escape)
- ARIA labels and roles
- Screen reader support
- High contrast mode compatible

✅ **Error Handling**
- Network failure recovery
- API rate limit handling
- Graceful degradation
- User-friendly error messages

✅ **Performance Optimizations**
- Parallel content fetching
- Debounced API calls
- Lazy loading
- Memory-efficient caching

## 🚀 Development Setup

```bash
# Clone repository
git clone <repository-url>
cd Gist

# Install dependencies
npm install

# Run tests
npm test

# Build for production
cp -r content popup icons lib manifest.json dist/

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

## 📚 API Reference

### Core Functions

**content.js:**
- `summarizeResults()` - Main orchestration function
- `scrapeGoogleUrls()` - Extracts URLs from search results
- `fetchPageContent(url)` - Retrieves page content with caching
- `cleanHtmlToText(html)` - Strips HTML to clean text
- `generateCacheKey(data)` - Creates hash for cache lookups
- `getCachedSummary(key)` - Retrieves cached summaries
- `cacheSummary(key, data)` - Stores summaries with TTL
- `displaySummary(markdown, urls)` - Renders summary overlay

**popup.js:**
- `saveSettings()` - Persists user configuration
- `loadSettings()` - Retrieves saved settings
- `validateApiKey(key)` - Validates API key format

### Configuration Options

```javascript
// Stored in chrome.storage.local
{
  flashApiKey: string,           // User's Google AI API key
  selectedLanguage: string,      // Output language (default: 'English')
  summaryFormat: string,         // 'detailed' | 'bullet' | 'concise'
  summary_<hash>: {              // Cached summaries
    markdown: string,
    urls: string[],
    timestamp: number
  },
  page_<hash>: {                 // Cached page content
    content: string,
    timestamp: number
  }
}
```

## 📊 Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Cold Start (no cache) | < 8s | ✅ ~5-7s |
| Warm Cache | < 100ms | ✅ ~50ms |
| URL Scraping | < 5ms | ✅ ~2ms |
| HTML Cleaning | < 10ms/page | ✅ ~5ms |
| Cache Key Generation | < 1ms | ✅ ~0.1ms |

## 🔒 Security & Privacy

- **No Data Collection**: Zero telemetry or analytics
- **Local Storage Only**: API keys stored in browser's local storage
- **No External Servers**: Direct API calls to Google AI
- **Minimal Permissions**: Only `storage` permission required
- **Open Source**: Full code transparency

## 🐛 Known Limitations

- Only works on Google Search (not Bing, DuckDuckGo, etc.)
- Requires valid Google AI API key
- Rate limited by Google AI API quotas
- Some websites may block content scraping
- Cache limited to browser storage quota (~10MB)

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Support for additional search engines
- Enhanced error recovery
- Custom prompt templates
- Export summaries to PDF/Markdown
- Browser sync for settings

## 📄 License

ISC License - Open source and free to use.

---

**Transform your search experience today!** Install Gist and get instant AI-powered summaries of any Google search.
