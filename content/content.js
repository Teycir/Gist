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
    const url = link.href;
    if (!seen.has(url) && !url.includes('youtube.com')) {
      seen.add(url);
      urls.push(url);
      if (urls.length >= 5) break;
    }
  }
  
  return urls;
}

function cleanHtmlToText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  ['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript'].forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });
  
  const text = doc.body?.innerText || '';
  return text.slice(0, 5000).trim();
}

function displaySummary(markdown) {
  const overlay = document.createElement('div');
  overlay.className = 'summary-overlay';
  
  const content = document.createElement('div');
  content.className = 'summary-content';
  
  const header = document.createElement('div');
  header.className = 'summary-header';
  
  const title = document.createElement('h2');
  title.className = 'summary-title';
  title.innerText = '🚀 AI Summary';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => overlay.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const body = document.createElement('div');
  body.className = 'summary-body';
  
  if (typeof showdown !== 'undefined') {
    const converter = new showdown.Converter();
    body.innerHTML = converter.makeHtml(markdown);
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

async function summarizeResults() {
  const btn = document.querySelector('.summarize-btn');
  const originalText = btn.innerText;
  
  try {
    const { flashApiKey } = await chrome.storage.local.get('flashApiKey');
    
    if (!flashApiKey) {
      alert('⚠️ Please enter your Google AI API Key in the extension settings first.');
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = 'Loading<span class="loading-spinner"></span>';
    
    const urls = scrapeGoogleUrls();
    
    if (urls.length === 0) {
      alert('No search results found to summarize.');
      return;
    }
    
    const fetchPromises = urls.map(url => 
      fetch(url)
        .then(r => r.text())
        .catch(() => '')
    );
    
    const pages = await Promise.all(fetchPromises);
    const corpus = pages
      .map(cleanHtmlToText)
      .filter(text => text.length > 100)
      .join('\n\n---\n\n');
    
    if (!corpus.trim()) {
      alert('Could not extract content from search results.');
      return;
    }
    
    const prompt = `You are a helpful assistant that summarizes search results. Analyze the following content from multiple web pages and provide a clear, concise summary. Focus on the key information and main points. Format your response in markdown with headers, bullet points, and emphasis where appropriate.\n\nContent:\n\n${corpus}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${flashApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const markdown = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!markdown) {
      throw new Error('No summary generated');
    }
    
    displaySummary(markdown);
    
  } catch (error) {
    console.error('Summarization error:', error);
    alert(`❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSummarizeButton);
} else {
  addSummarizeButton();
}
