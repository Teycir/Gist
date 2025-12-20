import { cleanHtml } from './lib/html-cleaner.js';

// Open settings page on icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
});

// Fetch helper with timeout
const fetchWithTimeout = (url, timeout = 2000, headers = {}) => {
  return fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...headers }
  });
};

// API proxy
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.action === 'callAPI') {
    fetch(msg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.body)
    })
      .then(r => r.json())
      .then(data => reply({ success: true, data }))
      .catch(err => reply({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === 'callOpenRouter') {
    fetch(msg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${msg.apiKey}`,
        'HTTP-Referer': 'https://github.com/Teycir/Gist',
        'X-Title': 'Gist Search Summarizer'
      },
      body: JSON.stringify(msg.body)
    })
      .then(r => r.json())
      .then(data => reply({ success: true, data }))
      .catch(err => reply({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === 'fetchPage') {
    fetchWithTimeout(msg.url)
      .then(r => r.text())
      .then(html => reply({ success: true, html }))
      .catch(err => reply({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === 'fetchAndProcessPages') {
    (async () => {
      const { urls } = msg;
      const results = [];
      const usedUrls = [];
      let completed = 0;

      await new Promise((resolve) => {
        urls.forEach((url) => {
          fetchWithTimeout(url, 1000)
            .then(r => r.text())
            .then(html => {
              completed++;
              const text = cleanHtml(html);
              if (text.length > 100 && results.length < 3) {
                results.push(text);
                usedUrls.push(url);
                if (results.length === 3) resolve();
              }
              if (completed === urls.length) resolve();
            })
            .catch(() => {
              completed++;
              if (completed === urls.length) resolve();
            });
        });
      });

      reply({ success: true, results, usedUrls });
    })();
    return true;
  }

  if (msg.action === 'getTabId') {
    reply({ tabId: sender.tab?.id });
    return true;
  }

  if (msg.action === 'openPopup') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    return true;
  }

  if (msg.action === 'multiSearch') {
    const { query } = msg;
    const engines = [
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    ];
    engines.forEach((url, i) => {
      chrome.tabs.create({ url, active: i === 0 }, tab => {
        chrome.storage.local.set({ [`autoSummarize_${tab.id}`]: true });
      });
    });
    return true;
  }

  if (msg.action === 'openDetailedSearch') {
    chrome.tabs.create({ url: msg.url }, tab => {
      chrome.storage.local.set({
        [`autoSummarize_${tab.id}`]: true,
        summaryFormat: 'detailed',
        selectedLanguage: msg.language,
        selectedModel: msg.model
      });
    });
    return true;
  }
});
