// Open settings page on icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
});

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
  
  if (msg.action === 'fetchPage') {
    fetch(msg.url, { 
      signal: AbortSignal.timeout(2000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
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
          fetch(url, { 
            signal: AbortSignal.timeout(1000),
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          })
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
  }
  
  if (msg.action === 'openPopup') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
  }
  
  if (msg.action === 'multiSearch') {
    const { query } = msg;
    const engines = [
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    ];
    engines.forEach((url, i) => {
      chrome.tabs.create({ url, active: i === 0 }, tab => {
        chrome.storage.local.set({ [`autoSummarize_${tab.id}`]: true });
      });
    });
  }
});

function cleanHtml(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<div[^>]*class="[^"]*\bad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*id="[^"]*\bad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="main-content"[^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of contentPatterns) {
    const match = text.match(pattern);
    if (match) {
      text = match[1];
      break;
    }
  }

  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}
