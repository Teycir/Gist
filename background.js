chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    return;
  }
  
  if (request.action === 'fetchPage') {
    fetch(request.url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'default',
      credentials: 'omit'
    })
      .then(response => response.text())
      .then(html => sendResponse({ success: true, html }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'callAPI') {
    fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(request.body)
    })
      .then(async response => {
        if (!response.ok) {
          const text = await response.text();
          let errorMsg = `API error: ${response.status}`;
          try {
            const errorData = JSON.parse(text);
            errorMsg = errorData.error?.message || errorMsg;
          } catch (e) {
            errorMsg = text || errorMsg;
          }
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
