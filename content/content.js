let cachedSummary = null;
const summaryCache = new Map();
const pageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;
const PAGE_CACHE_DURATION = 60 * 60 * 1000;
const domParser = new DOMParser();
let showdownConverter = null;
let summarizeBtn = null;
const YOUTUBE_REGEX = /youtube\.com/;

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

function cleanupCaches() {
  const now = Date.now();
  for (const [key, value] of summaryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) summaryCache.delete(key);
  }
  for (const [key, value] of pageCache.entries()) {
    if (now - value.timestamp > PAGE_CACHE_DURATION) pageCache.delete(key);
  }
  if (summaryCache.size > 10) {
    const oldest = Array.from(summaryCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp).slice(0, 3);
    oldest.forEach(([key]) => summaryCache.delete(key));
  }
}

function addSummarizeButton() {
  if (document.querySelector('.summarize-btn')) return;
  
  const btn = document.createElement('button');
  btn.innerText = '✨ Summarize with AI';
  btn.className = 'summarize-btn';
  btn.onclick = summarizeResults;
  document.body.appendChild(btn);
}

function scrapeGoogleUrls() {
  const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com"])');
  const urls = [];
  const seen = new Set();
  
  for (const link of links) {
    if (urls.length >= 3) break;
    const url = link.href;
    if (!YOUTUBE_REGEX.test(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  
  return urls;
}

function cleanHtmlToText(html) {
  const doc = domParser.parseFromString(html, 'text/html');
  
  doc.querySelectorAll('script, style, nav, header, footer, iframe, noscript, aside, form').forEach(el => el.remove());
  
  const mainContent = doc.querySelector('main, article, [role="main"], .content, .article, .post, .entry-content, .post-content, #main-content') || doc.body;
  
  return (mainContent.textContent || '').replace(/\s+/g, ' ').slice(0, 3000).trim();
}

function displaySummary(markdown, urls) {
  const overlay = document.createElement('div');
  overlay.className = 'summary-overlay';
  
  const content = document.createElement('div');
  content.className = 'summary-content';
  
  const header = document.createElement('div');
  header.className = 'summary-header';
  
  const title = document.createElement('h2');
  title.className = 'summary-title';
  title.innerText = '🚀 AI Summary';
  
  if (urls && urls.length > 0) {
    const urlsInfo = document.createElement('div');
    urlsInfo.className = 'summary-sources';
    urlsInfo.innerText = `Sources: ${urls.length} pages analyzed`;
    title.appendChild(urlsInfo);
  }
  
  const actions = document.createElement('div');
  actions.className = 'summary-actions';
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'close-btn';
  copyBtn.innerHTML = '📋';
  copyBtn.title = 'Copy summary';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(markdown);
    copyBtn.innerHTML = '✓';
    setTimeout(() => copyBtn.innerHTML = '📋', 2000);
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => overlay.remove();
  
  actions.appendChild(copyBtn);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);
  
  const body = document.createElement('div');
  body.className = 'summary-body';
  
  if (typeof showdown !== 'undefined') {
    if (!showdownConverter) showdownConverter = new showdown.Converter();
    body.innerHTML = showdownConverter.makeHtml(markdown);
    body.querySelectorAll('a').forEach(link => {
      link.target = '_blank';
      link.className = 'summary-link';
    });
  } else {
    body.innerText = markdown;
  }
  
  content.appendChild(header);
  content.appendChild(body);
  overlay.appendChild(content);
  
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  
  document.body.appendChild(overlay);
}

function extractSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('q') || document.querySelector('input[name="q"]')?.value || '';
}

async function getCachedPage(url) {
  const cached = pageCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < PAGE_CACHE_DURATION) {
    return cached.content;
  }
  
  const storageKey = `page_${simpleHash(url)}`;
  const stored = await chrome.storage.local.get(storageKey);
  if (stored[storageKey] && (Date.now() - stored[storageKey].timestamp) < PAGE_CACHE_DURATION) {
    pageCache.set(url, stored[storageKey]);
    return stored[storageKey].content;
  }
  
  return null;
}

async function setCachedPage(url, content) {
  const cacheData = { content, timestamp: Date.now() };
  pageCache.set(url, cacheData);
  
  const storageKey = `page_${simpleHash(url)}`;
  await chrome.storage.local.set({ [storageKey]: cacheData });
}

async function fetchWithTimeout(url, timeout = 3000) {
  const cached = await getCachedPage(url);
  if (cached) return cached;
  
  const content = await Promise.race([
    fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'default'
    }).then(r => r.text()),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]).catch(() => '');
  
  if (content) await setCachedPage(url, content);
  return content;
}

async function summarizeResults() {
  if (!summarizeBtn) summarizeBtn = document.querySelector('.summarize-btn');
  const btn = summarizeBtn;
  const originalText = btn.innerText;
  
  try {
    const { flashApiKey, selectedModel, selectedLanguage, summaryFormat } = await chrome.storage.local.get(['flashApiKey', 'selectedModel', 'selectedLanguage', 'summaryFormat']);
    
    if (!flashApiKey) {
      if (confirm('⚠️ Please enter your Google AI API Key in the extension settings first.\n\nClick OK to get your API key from Google AI Studio.')) {
        window.open('https://aistudio.google.com/api-keys', '_blank');
      }
      return;
    }
    
    const model = selectedModel || 'models/gemini-1.5-flash';
    const language = selectedLanguage || 'English';
    const format = summaryFormat || 'detailed';
    
    const searchQuery = extractSearchQuery();
    const urls = scrapeGoogleUrls();
    const cacheKey = `${searchQuery}-${urls.join(',')}-${language}-${format}`;
    
    const cached = summaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      displaySummary(cached.markdown, cached.urls);
      return;
    }
    
    const storageKey = `summary_${simpleHash(cacheKey)}`;
    const stored = await chrome.storage.local.get(storageKey);
    if (stored[storageKey] && (Date.now() - stored[storageKey].timestamp) < CACHE_DURATION) {
      summaryCache.set(cacheKey, stored[storageKey]);
      displaySummary(stored[storageKey].markdown, stored[storageKey].urls);
      return;
    }
    
    const formatInstructions = {
      detailed: 'Provide a comprehensive summary with detailed explanations, context, examples, and in-depth analysis for each point.',
      brief: 'Provide a brief, concise summary in 3-5 bullet points.',
      keypoints: 'List only the key takeaways as short bullet points.'
    };
    
    const maxTokens = format === 'detailed' ? 4000 : 500;
    const wordLimit = format === 'detailed' ? 2000 : 300;
    
    btn.disabled = true;
    btn.innerHTML = 'Finding sources<span class="loading-spinner"></span>';
    console.log('References:', urls);
    
    if (urls.length === 0) {
      alert('No search results found to summarize.');
      return;
    }
    
    const MAX_CONCURRENT = 2;
    const pages = [];
    
    for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
      btn.innerHTML = `Fetching content (${i}/${urls.length})<span class="loading-spinner"></span>`;
      const batch = urls.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(batch.map(url => fetchWithTimeout(url)));
      pages.push(...batchResults);
    }
    
    btn.innerHTML = 'Analyzing<span class="loading-spinner"></span>';
    const extractedContent = pages
      .map(html => cleanHtmlToText(html))
      .filter(text => text.length > 100);
    
    if (extractedContent.length === 0) {
      alert('Could not extract content from search results.');
      return;
    }
    
    btn.innerHTML = 'Generating summary<span class="loading-spinner"></span>';
    
    const sources = extractedContent.map((text, i) => `[${i + 1}] ${text}`);
    const prompt = `Summarize these ${extractedContent.length} web sources about the search query.

Format: Start with "# Title" then ${format === 'detailed' ? '4-6 detailed bullet points' : '3-5 bullet points'} with [1], [2] citations in ${language}. ${formatInstructions[format]}

Sources:
${sources.join('\n\n')}

Keep summary under ${wordLimit} words. Focus on key facts and insights.`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${flashApiKey}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.3
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    let markdown = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!markdown) {
      throw new Error('No summary generated');
    }
    
    const references = urls.map((url, i) => `[${i + 1}] ${url}`).join('\n');
    if (!markdown.toLowerCase().includes('## references')) {
      markdown += `\n\n## References\n${references}`;
    }
    
    const cacheData = { markdown, urls, timestamp: Date.now() };
    summaryCache.set(cacheKey, cacheData);
    await chrome.storage.local.set({ [storageKey]: cacheData });
    
    cachedSummary = markdown;
    displaySummary(markdown, urls);
    
  } catch (error) {
    console.error('Summarization error:', error);
    alert(`❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

if (typeof document !== 'undefined') {
  let lastKeydownTime = 0;
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const now = Date.now();
      if (now - lastKeydownTime > 100) {
        lastKeydownTime = now;
        summarizeResults();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSummarizeButton, { once: true });
  } else {
    addSummarizeButton();
  }
  
  setInterval(cleanupCaches, 5 * 60 * 1000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeGoogleUrls, cleanHtmlToText, addSummarizeButton, displaySummary, summarizeResults };
}
