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
