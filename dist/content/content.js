let cachedSummary = null;
const summaryCache = new Map();
const pageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;
const PAGE_CACHE_DURATION = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 15;
const MAX_PAGE_CACHE_SIZE = 30;
const domParser = new DOMParser();
const memoCache = new Map();

function memoize(fn, keyFn) {
  return function(...args) {
    const key = keyFn ? keyFn(...args) : args[0];
    if (memoCache.has(key)) return memoCache.get(key);
    const result = fn.apply(this, args);
    memoCache.set(key, result);
    if (memoCache.size > 100) memoCache.delete(memoCache.keys().next().value);
    return result;
  };
}

function batchDOMUpdates(callback) {
  requestAnimationFrame(() => callback());
}
let showdownConverter = null;
let showdownLoaded = false;
let showdownLoadPromise = null;
let summarizeBtn = null;
const YOUTUBE_REGEX = /youtube\.com/;
let isProcessing = false;
let conversationHistory = [];

const simpleHash = memoize((str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
});

async function getStorageSize() {
  try {
    const items = await chrome.storage.local.get(null);
    const size = JSON.stringify(items).length;
    return size;
  } catch (e) {
    return 0;
  }
}

async function clearOldCaches() {
  try {
    const items = await chrome.storage.local.get(null);
    const keys = Object.keys(items).filter(k => k.startsWith('page_') || k.startsWith('summary_'));
    const sorted = keys.map(k => ({ key: k, time: items[k]?.timestamp || 0 })).sort((a, b) => a.time - b.time);
    const toRemove = sorted.slice(0, Math.ceil(keys.length / 2)).map(x => x.key);
    if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
  } catch (e) {}
}

function cleanupCaches() {
  const now = Date.now();
  
  for (const [key, value] of summaryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) summaryCache.delete(key);
  }
  
  for (const [key, value] of pageCache.entries()) {
    if (now - value.timestamp > PAGE_CACHE_DURATION) pageCache.delete(key);
  }
  
  if (summaryCache.size > MAX_CACHE_SIZE) {
    const oldest = Array.from(summaryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.ceil(MAX_CACHE_SIZE / 3));
    oldest.forEach(([key]) => summaryCache.delete(key));
  }
  
  if (pageCache.size > MAX_PAGE_CACHE_SIZE) {
    const oldest = Array.from(pageCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.ceil(MAX_PAGE_CACHE_SIZE / 3));
    oldest.forEach(([key]) => pageCache.delete(key));
  }
}

function addSummarizeButton() {
  if (document.querySelector('.summarize-btn')) return;
  
  batchDOMUpdates(() => {
    const btn = document.createElement('button');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="24" height="24"><rect x="28" y="20" width="72" height="88" rx="8" fill="#fff"/><rect x="40" y="40" width="48" height="4" rx="2" fill="#667eea" opacity="0.9"/><rect x="40" y="52" width="48" height="4" rx="2" fill="#667eea" opacity="0.9"/><rect x="40" y="64" width="32" height="4" rx="2" fill="#667eea" opacity="0.9"/><path d="M88 76 L92 80 L88 84 M84 80 L92 80" stroke="#ffd700" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="78" cy="72" r="2" fill="#ffd700"/><circle cx="94" cy="72" r="1.5" fill="#ffd700"/><circle cx="94" cy="88" r="1.5" fill="#ffd700"/></svg>';
    btn.className = 'summarize-btn';
    btn.setAttribute('data-tooltip', 'Summarize');
    btn.setAttribute('aria-label', 'Summarize search results with AI');
    btn.onclick = summarizeResults;
    document.body.appendChild(btn);
    summarizeBtn = btn;
    updateButtonLanguage();
  });
}

function updateButtonLanguage() {
  if (!summarizeBtn) return;
  chrome.storage.local.get('selectedLanguage', ({ selectedLanguage }) => {
    const translations = {
      English: 'Summarize',
      Spanish: 'Resumir',
      French: 'Résumer',
      German: 'Zusammenfassen'
    };
    const tooltipText = translations[selectedLanguage] || 'Summarize';
    summarizeBtn.setAttribute('data-tooltip', tooltipText);
    summarizeBtn.removeAttribute('title');
    summarizeBtn.setAttribute('aria-label', tooltipText);
  });
}

function detectSearchEngine() {
  const hostname = window.location.hostname;
  if (hostname.includes('google.com')) return 'google';
  if (hostname.includes('bing.com')) return 'bing';
  if (hostname.includes('duckduckgo.com')) return 'duckduckgo';
  return null;
}

function scrapeUrls() {
  const engine = detectSearchEngine();
  const urls = [];
  const seen = new Set();
  
  if (engine === 'bing') {
    const links = document.querySelectorAll('#b_results li.b_algo h2 a');
    for (const link of links) {
      if (urls.length >= 3) break;
      let href = link.getAttribute('href');
      if (href && href.includes('/ck/a')) {
        href = href.replace(/&amp;/g, '&');
        const match = href.match(/[?&]u=a1([^&]+)/);
        if (match) {
          try {
            const url = atob(decodeURIComponent(match[1]));
            if (url && url.startsWith('http') && !YOUTUBE_REGEX.test(url) && !seen.has(url)) {
              seen.add(url);
              urls.push(url);
            }
          } catch (e) {}
        }
      }
    }
  } else if (engine === 'duckduckgo') {
    const links = document.querySelectorAll('article[data-testid="result"] a[href^="http"]');
    for (const link of links) {
      if (urls.length >= 3) break;
      const url = link.href;
      if (url && !YOUTUBE_REGEX.test(url) && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  } else {
    const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com"])');
    for (const link of links) {
      if (urls.length >= 3) break;
      const url = link.href;
      if (url && !YOUTUBE_REGEX.test(url) && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  
  return urls;
}

function scrapeGoogleUrls() {
  return scrapeUrls();
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/i);
  } catch {
    return false;
  }
}

function sanitizeText(text) {
  return text.replace(/[<>"'&]/g, char => {
    const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'};
    return map[char];
  });
}

const cleanHtmlToText = memoize((html) => {
  const doc = domParser.parseFromString(html, 'text/html');
  
  // Remove noise elements
  const removeSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript', 'aside', 'form',
    '.ad', '.advertisement', '.ads', '[class*="ad-"]', '[id*="ad-"]',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '.sidebar', '.menu', '.navigation', '.social-share', '.comments'
  ];
  removeSelectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.remove()));
  
  // Prioritize main content
  const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.article', '.post', '.entry-content', '.post-content', '#main-content'];
  for (const sel of contentSelectors) {
    const content = doc.querySelector(sel);
    if (content) return content.textContent.replace(/\s+/g, ' ').slice(0, 1200).trim();
  }
  
  return (doc.body?.textContent || '').replace(/\s+/g, ' ').slice(0, 1200).trim();
}, (html) => simpleHash(html));

async function displaySummary(markdown, urls, format, language) {
  loadNonCriticalCSS();
  console.log('displaySummary called', { markdown: markdown.substring(0, 100), urls, format, language });
  const overlay = document.createElement('div');
  overlay.className = 'summary-overlay';
  
  chrome.storage.local.get(['darkMode'], (data) => {
    if (data.darkMode) document.body.classList.add('dark');
  });
  
  const content = document.createElement('div');
  content.className = 'summary-content';
  
  const header = document.createElement('div');
  header.className = 'summary-header';
  
  const engine = detectSearchEngine();
  const engineNames = {
    google: 'Google',
    bing: 'Bing',
    duckduckgo: 'DuckDuckGo'
  };
  const engineName = engineNames[engine] || 'AI';
  
  const translations = {
    English: {
      brief: `🚀 ${engineName} Brief Summary`,
      detailed: `🚀 ${engineName} Detailed Summary`,
      keypoints: `🚀 ${engineName} Key Points Summary`,
      top: 'Top',
      analyzed: 'search results',
      copy: 'Copy',
      save: 'Save',
      share: 'Share',
      close: 'Close',
      shareX: 'Share on X',
      shareLinkedIn: 'Share on LinkedIn',
      shareEmail: 'Share via Email',
      history: 'History',
      favorites: 'Favorites',
      favorite: 'Favorite'
    },
    Spanish: {
      brief: `🚀 Resumen Breve de ${engineName}`,
      detailed: `🚀 Resumen Detallado de ${engineName}`,
      keypoints: `🚀 Puntos Clave de ${engineName}`,
      top: 'Top',
      analyzed: 'resultados de búsqueda',
      copy: 'Copiar',
      save: 'Guardar',
      share: 'Compartir',
      close: 'Cerrar',
      shareX: 'Compartir en X',
      shareLinkedIn: 'Compartir en LinkedIn',
      shareEmail: 'Compartir por correo',
      history: 'Historial',
      favorites: 'Favoritos',
      favorite: 'Favorito'
    },
    French: {
      brief: `🚀 Résumé Bref ${engineName}`,
      detailed: `🚀 Résumé Détaillé ${engineName}`,
      keypoints: `🚀 Points Clés ${engineName}`,
      top: 'Top',
      analyzed: 'résultats de recherche',
      copy: 'Copier',
      save: 'Enregistrer',
      share: 'Partager',
      close: 'Fermer',
      shareX: 'Partager sur X',
      shareLinkedIn: 'Partager sur LinkedIn',
      shareEmail: 'Partager par e-mail',
      history: 'Historique',
      favorites: 'Favoris',
      favorite: 'Favori'
    },
    German: {
      brief: `🚀 ${engineName}-Kurzzusammenfassung`,
      detailed: `🚀 ${engineName}-Detaillierte Zusammenfassung`,
      keypoints: `🚀 ${engineName}-Kernpunkte`,
      top: 'Top',
      analyzed: 'Suchergebnisse',
      copy: 'Kopieren',
      save: 'Speichern',
      share: 'Teilen',
      close: 'Schließen',
      shareX: 'Auf X teilen',
      shareLinkedIn: 'Auf LinkedIn teilen',
      shareEmail: 'Per E-Mail teilen',
      history: 'Verlauf',
      favorites: 'Favoriten',
      favorite: 'Favorit'
    }
  };
  
  const t = translations[language] || translations.English;
  
  const title = document.createElement('h2');
  title.className = 'summary-title';
  title.textContent = t[format] || t.brief;
  
  if (urls && urls.length > 0) {
    const urlsInfo = document.createElement('div');
    urlsInfo.className = 'summary-sources';
    urlsInfo.textContent = `${t.top} ${urls.length} ${t.analyzed}`;
    title.appendChild(urlsInfo);
  }
  
  const actions = document.createElement('div');
  actions.className = 'summary-actions';
  
  const historyBtn = document.createElement('button');
  historyBtn.className = 'close-btn';
  historyBtn.innerHTML = '📚';
  historyBtn.setAttribute('data-tooltip', t.history);
  let historyVisible = false;
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'close-btn';
  refreshBtn.innerHTML = '🔄';
  const refreshTooltips = {
    English: 'Refresh (bypass cache)',
    Spanish: 'Actualizar (omitir caché)',
    French: 'Actualiser (ignorer le cache)',
    German: 'Aktualisieren (Cache umgehen)'
  };
  refreshBtn.setAttribute('data-tooltip', refreshTooltips[language] || refreshTooltips.English);
  refreshBtn.onclick = async () => {
    overlay.remove();
    const searchQuery = extractSearchQuery();
    const cacheKey = `${searchQuery}-${urls.join(',')}-${language}-${format}`;
    summaryCache.delete(cacheKey);
    const storageKey = `summary_${simpleHash(cacheKey)}`;
    await chrome.storage.local.remove(storageKey);
    await summarizeResults();
  };
  
  const starBtn = document.createElement('button');
  starBtn.className = 'close-btn';
  const favKey = `fav_${simpleHash(markdown)}`;
  chrome.storage.local.get(favKey, (result) => {
    starBtn.innerHTML = result[favKey] ? '⭐' : '☆';
  });
  starBtn.setAttribute('data-tooltip', t.favorite);
  starBtn.onclick = async () => {
    const result = await chrome.storage.local.get(favKey);
    if (result[favKey]) {
      await chrome.storage.local.remove(favKey);
      starBtn.innerHTML = '☆';
    } else {
      await chrome.storage.local.set({ [favKey]: { markdown, urls, timestamp: Date.now(), query: extractSearchQuery() } });
      starBtn.innerHTML = '⭐';
    }
  };
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'close-btn';
  copyBtn.innerHTML = '📋';
  copyBtn.setAttribute('data-tooltip', t.copy);
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(markdown);
    copyBtn.innerHTML = '✓';
    setTimeout(() => copyBtn.innerHTML = '📋', 2000);
  };
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'close-btn';
  saveBtn.innerHTML = '💾';
  saveBtn.setAttribute('data-tooltip', t.save);
  saveBtn.onclick = () => {
    const query = extractSearchQuery().replace(/[^a-z0-9]/gi, '_').slice(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gist_${engineName.toLowerCase()}_${query}_${timestamp}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    saveBtn.innerHTML = '✓';
    setTimeout(() => saveBtn.innerHTML = '💾', 2000);
  };
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'close-btn share-btn';
  shareBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M15.5 6.5L8.5 10.5M8.5 13.5L15.5 17.5" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
  shareBtn.setAttribute('data-tooltip', t.share);
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    const menu = document.createElement('div');
    menu.className = 'share-menu';
    
    const xBtn = document.createElement('button');
    xBtn.className = 'share-option';
    xBtn.innerHTML = `𝕏 ${t.shareX}`;
    xBtn.onclick = () => {
      const text = `${markdown.split('\n')[0].replace(/^#\s*/, '')}\n\nSearch: ${extractSearchQuery()}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
      menu.remove();
    };
    
    const linkedinBtn = document.createElement('button');
    linkedinBtn.className = 'share-option';
    linkedinBtn.innerHTML = `in ${t.shareLinkedIn}`;
    linkedinBtn.onclick = () => {
      const text = `${markdown.split('\n')[0].replace(/^#\s*/, '')}\n\nSearch: ${extractSearchQuery()}`;
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`, '_blank');
      menu.remove();
    };
    
    const emailBtn = document.createElement('button');
    emailBtn.className = 'share-option';
    emailBtn.innerHTML = `✉️ ${t.shareEmail}`;
    emailBtn.onclick = () => {
      const subject = markdown.split('\n')[0].replace(/^#\s*/, '');
      const body = `${markdown}\n\nSearch: ${extractSearchQuery()}`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      menu.remove();
    };
    
    menu.appendChild(xBtn);
    menu.appendChild(linkedinBtn);
    menu.appendChild(emailBtn);
    shareBtn.appendChild(menu);
    
    const closeMenu = (ev) => {
      if (!shareBtn.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.setAttribute('data-tooltip', t.close);
  closeBtn.onclick = () => overlay.remove();
  
  actions.appendChild(historyBtn);
  actions.appendChild(refreshBtn);
  actions.appendChild(starBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);
  
  const body = document.createElement('div');
  body.className = 'summary-body';
  
  const historyPanel = document.createElement('div');
  historyPanel.className = 'history-panel-inline';
  historyPanel.style.display = 'none';
  
  historyBtn.onclick = async () => {
    historyVisible = !historyVisible;
    if (historyVisible) {
      const items = await chrome.storage.local.get(null);
      const allSummaries = Object.entries(items)
        .filter(([k]) => k.startsWith('summary_'))
        .map(([k, v]) => ({ key: k, ...v, isFav: false }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
      
      const favorites = Object.entries(items)
        .filter(([k]) => k.startsWith('fav_'))
        .map(([k, v]) => ({ key: k, ...v, isFav: true }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      const summaries = [...favorites, ...allSummaries];
      historyPanel.innerHTML = '';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'history-search';
      searchInput.placeholder = language === 'Spanish' ? '🔍 Buscar en historial...' : language === 'French' ? '🔍 Rechercher dans l\'historique...' : language === 'German' ? '🔍 Im Verlauf suchen...' : '🔍 Search history...';
      historyPanel.appendChild(searchInput);
      
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'history-items-container';
      historyPanel.appendChild(itemsContainer);
      
      const scrollBtns = document.createElement('div');
      scrollBtns.className = 'history-scroll-btns';
      const topBtn = document.createElement('button');
      topBtn.className = 'history-scroll-btn';
      topBtn.innerHTML = '⇈';
      topBtn.onclick = () => itemsContainer.scrollTo({ top: 0, behavior: 'smooth' });
      const upBtn = document.createElement('button');
      upBtn.className = 'history-scroll-btn';
      upBtn.innerHTML = '▲';
      upBtn.onclick = () => itemsContainer.scrollBy({ top: -100, behavior: 'smooth' });
      const downBtn = document.createElement('button');
      downBtn.className = 'history-scroll-btn';
      downBtn.innerHTML = '▼';
      downBtn.onclick = () => itemsContainer.scrollBy({ top: 100, behavior: 'smooth' });
      const bottomBtn = document.createElement('button');
      bottomBtn.className = 'history-scroll-btn';
      bottomBtn.innerHTML = '⇊';
      bottomBtn.onclick = () => itemsContainer.scrollTo({ top: itemsContainer.scrollHeight, behavior: 'smooth' });
      scrollBtns.appendChild(topBtn);
      scrollBtns.appendChild(upBtn);
      scrollBtns.appendChild(downBtn);
      scrollBtns.appendChild(bottomBtn);
      historyPanel.appendChild(scrollBtns);
      
      const renderItems = (filter = '') => {
        const filtered = summaries.filter(({ markdown: md, query }) => {
          const title = md.split('\n')[0].replace(/^#\s*/, '').toLowerCase();
          const q = (query || '').toLowerCase();
          const f = filter.toLowerCase();
          return title.includes(f) || q.includes(f);
        });
        
        batchDOMUpdates(() => {
          const fragment = document.createDocumentFragment();
          filtered.forEach(({ markdown: md, urls: u, timestamp, query, isFav }) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const titleText = md.split('\n')[0].replace(/^#\s*/, '').slice(0, 60);
            const date = new Date(timestamp).toLocaleDateString();
            const favIcon = isFav ? '⭐ ' : '';
            const queryText = query ? `<div class="history-item-query">🔍 ${sanitizeText(query)}</div>` : '';
            item.innerHTML = `<div class="history-item-title">${favIcon}${sanitizeText(titleText)}</div>${queryText}<div class="history-item-date">${date}</div>`;
            item.onclick = () => {
              body.innerHTML = showdownConverter ? showdownConverter.makeHtml(md) : md;
              body.querySelectorAll('a').forEach(link => {
                if (isValidUrl(link.href)) {
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  link.className = 'summary-link';
                }
              });
              historyPanel.style.display = 'none';
              body.style.display = 'block';
              followUpSection.style.display = 'block';
              historyVisible = false;
            };
            fragment.appendChild(item);
          });
          itemsContainer.innerHTML = '';
          itemsContainer.appendChild(fragment);
        });
      };
      
      let searchTimeout;
      searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => renderItems(e.target.value), 150);
      };
      renderItems();
      
      body.style.display = 'none';
      followUpSection.style.display = 'none';
      historyPanel.style.display = 'block';
    } else {
      body.style.display = 'block';
      followUpSection.style.display = 'block';
      historyPanel.style.display = 'none';
    }
  };
  
  // Store markdown for later conversion in iframe
  console.log('[displaySummary] Storing markdown in body attribute');
  console.log('[displaySummary] Markdown length:', markdown.length);
  body.setAttribute('data-markdown', markdown);
  body.textContent = 'Loading...';
  
  content.appendChild(header);
  content.appendChild(historyPanel);
  content.appendChild(body);
  
  // Follow-up question section
  const followUpSection = document.createElement('div');
  followUpSection.className = 'followup-section';
  
  const followUpInput = document.createElement('input');
  followUpInput.type = 'text';
  followUpInput.className = 'followup-input';
  followUpInput.placeholder = language === 'Spanish' ? 'Hacer una pregunta - luego presione Enter' : language === 'French' ? 'Poser une question - puis appuyez sur Entrée' : language === 'German' ? 'Eine Frage stellen - dann Enter drücken' : 'Ask a follow-up question - then push Enter';
  
  const conversationDiv = document.createElement('div');
  conversationDiv.className = 'conversation-history';
  
  const handleFollowUp = async () => {
    const question = followUpInput.value.trim();
    if (!question) return;
    
    followUpInput.disabled = true;
    
    const questionBubble = document.createElement('div');
    questionBubble.className = 'chat-bubble user';
    questionBubble.textContent = question;
    conversationDiv.appendChild(questionBubble);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
    
    try {
      const { flashApiKey, selectedModel } = await chrome.storage.local.get(['flashApiKey', 'selectedModel']);
      const prompt = `Based on this summary:\n\n${markdown}\n\nUser question: ${question}\n\nProvide a concise answer in ${language}.`;
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${flashApiKey}`;
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'callAPI',
          url: apiUrl,
          body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.3 }
          }
        }, res => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : res?.success ? resolve(res.data) : reject(new Error(res?.error || 'API failed')));
      });
      
      const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
      
      const answerBubble = document.createElement('div');
      answerBubble.className = 'chat-bubble ai';
      if (typeof showdown !== 'undefined') {
        answerBubble.innerHTML = showdownConverter.makeHtml(answer);
      } else {
        answerBubble.textContent = answer;
      }
      conversationDiv.appendChild(answerBubble);
      conversationDiv.scrollTop = conversationDiv.scrollHeight;
      
      conversationHistory.push({ question, answer });
    } catch (error) {
      const errorBubble = document.createElement('div');
      errorBubble.className = 'chat-bubble error';
      errorBubble.textContent = `Error: ${error.message}`;
      conversationDiv.appendChild(errorBubble);
    } finally {
      followUpInput.value = '';
      followUpInput.disabled = false;
      followUpInput.focus();
    }
  };
  
  let followUpTimeout;
  followUpInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(followUpTimeout);
      followUpTimeout = setTimeout(handleFollowUp, 100);
    }
  };
  
  followUpSection.appendChild(conversationDiv);
  followUpSection.appendChild(followUpInput);
  content.appendChild(followUpSection);
  
  overlay.appendChild(content);
  
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  
  // Create iframe to isolate from Bing's DOM manipulation
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:2147483647';
  document.documentElement.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument;
  iframeDoc.open();
  chrome.storage.local.get(['darkMode'], (data) => {
    if (data.darkMode) iframeDoc.body.classList.add('dark');
  });
  
  const iframeHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body.dark { background: #1a1a2e; color: #e0e0e0; }
        body.dark .overlay-bg { background: rgba(0,0,0,0.9); }
        body.dark .summary-content { background: #1e1e2e; color: #e0e0e0; }
        body.dark .summary-title { -webkit-text-fill-color: transparent; }
        body.dark .summary-sources { color: #b0b0b0; }
        body.dark .summary-body { color: #d0d0d0; }
        body.dark .summary-body h1, body.dark .summary-body h2 { color: #e0e0e0; }
        body.dark .close-btn { background: #2a2a3e; color: #e0e0e0; }
        body.dark .close-btn:hover { background: #3a3a4e; }
        body.dark .share-menu { background: #2a2a3e; border: 1px solid #3a3a4e; }
        body.dark .share-option { color: #e0e0e0; }
        body.dark .share-option:hover { background: #3a3a4e; }
        body.dark .followup-input { background: #2a2a3e; color: #e0e0e0; border-color: #667eea; }
        body.dark .chat-bubble.ai { background: #2a2a3e; color: #d0d0d0; }
        body.dark .history-search { background: #2a2a3e; color: #e0e0e0; border-color: #3a3a4e; }
        body.dark .history-search:focus { border-color: #667eea; }
        body.dark .history-item { background: #2a2a3e; border-color: #3a3a4e; }
        body.dark .history-item:hover { background: #3a3a4e; border-color: #667eea; }
        body.dark .history-item-title { color: #e0e0e0; }
        body.dark .history-item-query { color: #8899ff; }
        body.dark .history-item-date { color: #b0b0b0; }
        .overlay-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 999999; }
        .summary-content { background: white; border-radius: 16px; padding: 36px; width: 90vw; max-width: 950px; max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.35); }
        @media (max-width: 768px) { .summary-content { width: 95vw; padding: 24px; } }
        .summary-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e8eaed; }
        .summary-title { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; flex: 1; }
        .summary-sources { font-size: 13px; color: #5f6368; font-weight: 500; margin-top: 8px; display: block; }
        .summary-actions { display: flex; gap: 10px; flex-shrink: 0; }
        .close-btn { background: #f8f9fa; border: none; font-size: 20px; color: #5f6368; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.2s; }
        .close-btn:hover { background: #e8eaed; transform: scale(1.1); }
        .close-btn[data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; bottom: -32px; left: 50%; transform: translateX(-50%); background: white; color: #202124; padding: 6px 10px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid #e8eaed; }
        .share-btn { position: relative; }
        .share-menu { position: absolute; top: 45px; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); padding: 8px; min-width: 180px; z-index: 1001; }
        .share-option { display: block; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; cursor: pointer; border-radius: 6px; font-size: 14px; color: #202124; transition: background 0.2s; }
        .share-option:hover { background: #f8f9fa; }
        .summary-body { font-size: 16px; line-height: 1.7; color: #3c4043; margin-bottom: 24px; }
        .summary-body h1, .summary-body h2 { margin-top: 20px; color: #202124; font-weight: 700; }
        .summary-body h1 { font-size: 24px; }
        .summary-body h2 { font-size: 20px; }
        .summary-body ul { padding-left: 20px; margin: 12px 0; }
        .summary-body li { margin: 8px 0; }
        .summary-link { color: #1a73e8; text-decoration: none; }
        .summary-link:hover { text-decoration: underline; }
        .followup-section { margin-top: 24px; padding-top: 20px; border-top: 2px solid #e8eaed; }
        .conversation-history { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
        .chat-bubble { padding: 10px 14px; border-radius: 12px; max-width: 80%; font-size: 14px; line-height: 1.5; animation: bubbleIn 0.3s ease; }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .chat-bubble.user { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .chat-bubble.ai { background: #f1f3f4; color: #3c4043; align-self: flex-start; border-bottom-left-radius: 4px; }
        .chat-bubble.error { background: #fce8e6; color: #c5221f; align-self: flex-start; border-bottom-left-radius: 4px; }
        .followup-input { width: 100%; padding: 14px 20px; border: 3px solid #667eea; border-radius: 12px; font-size: 14px; outline: none; transition: all 0.2s ease; font-family: inherit; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15); }
        .followup-input:focus { border-color: #764ba2; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); }
        .followup-input:disabled { background: #f8f9fa; cursor: not-allowed; opacity: 0.6; }
        .history-panel-inline { display: flex; flex-direction: column; gap: 10px; max-height: 50vh; margin-bottom: 20px; position: relative; }
        .history-search { width: calc(100% - 45px); padding: 10px 14px; border: 2px solid #e8eaed; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s; margin-bottom: 10px; }
        .history-search:focus { border-color: #667eea; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2); }
        .history-items-container { display: flex; flex-direction: column; gap: 8px; max-height: 40vh; overflow-y: hidden; }
        .history-scroll-btns { position: absolute; right: 0; top: 50px; display: flex; flex-direction: column; gap: 8px; }
        .history-scroll-btn { background: #f8f9fa; border: none; font-size: 18px; color: #5f6368; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .history-scroll-btn:hover { background: #e8eaed; transform: scale(1.1); }
        body.dark .history-scroll-btn { background: #2a2a3e; color: #e0e0e0; }
        body.dark .history-scroll-btn:hover { background: #3a3a4e; }
        .history-item { padding: 14px 18px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 2px solid #e8eaed; margin-bottom: 8px; margin-right: 45px; }
        .history-item:hover { background: #e8eaed; border-color: #667eea; }
        .history-item-title { font-size: 14px; font-weight: 600; color: #202124; margin-bottom: 4px; }
        .history-item-query { font-size: 12px; color: #667eea; margin-bottom: 3px; }
        .history-item-date { font-size: 11px; color: #5f6368; }
      </style>
    </head>
    <body></body>
    </html>
  `;
  
  console.log('[displaySummary] Writing HTML to iframe');
  iframeDoc.write(iframeHTML);
  iframeDoc.close();
  console.log('[displaySummary] iframe document closed');
  
  // Wait for iframe to be ready
  const iframeLoadPromise = new Promise(resolve => {
    iframe.onload = () => {
    console.log('[iframe.onload] Iframe loaded');
    
    console.log('[iframe.onload] Creating overlay background');
    const overlayBg = iframeDoc.createElement('div');
    overlayBg.className = 'overlay-bg';
    overlayBg.onclick = (e) => { if (e.target === overlayBg) iframe.remove(); };
    console.log('[iframe.onload] Appending overlay to overlayBg');
    overlayBg.appendChild(overlay);
    console.log('[iframe.onload] Appending overlayBg to iframe body');
    iframeDoc.body.appendChild(overlayBg);
    console.log('[iframe.onload] Overlay appended successfully');
    
    // Simple markdown to HTML converter
    const convertMarkdown = () => {
      const iframeBody = iframeDoc.querySelector('.summary-body');
      const md = iframeBody?.getAttribute('data-markdown');
      
      if (!md) {
        resolve();
        return;
      }
      
      const decodedMarkdown = md.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      
      let html = decodedMarkdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="summary-link">$1</a>')
        .replace(/^\*   (.+)$/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gim, '<p>$1</p>')
        .replace(/<\/p><p><h/g, '</p><h')
        .replace(/<\/h([123])><\/p>/g, '</h$1>')
        .replace(/<p><\/p>/g, '')
        .replace(/<p>(<ul>)/g, '$1')
        .replace(/(<\/ul>)<\/p>/g, '$1');
      
      iframeBody.innerHTML = html;
      resolve();
    };
    
    setTimeout(convertMarkdown, 10);
    };
  });
  
  await iframeLoadPromise;
  
  // Update remove function
  const originalRemove = overlay.remove.bind(overlay);
  overlay.remove = () => iframe.remove();
}

function extractSearchQuery() {
  const engine = detectSearchEngine();
  const urlParams = new URLSearchParams(window.location.search);
  
  if (engine === 'google' || engine === 'bing') {
    return urlParams.get('q') || document.querySelector('input[name="q"]')?.value || '';
  }
  if (engine === 'duckduckgo') {
    return urlParams.get('q') || document.querySelector('input[name="q"]')?.value || '';
  }
  
  return urlParams.get('q') || '';
}

async function updateStats(type) {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['usageStats']);
  const stats = data.usageStats || { apiCalls: 0, cacheHits: 0, totalSummaries: 0, lastReset: today };
  
  if (stats.lastReset !== today) {
    stats.apiCalls = 0;
    stats.cacheHits = 0;
    stats.lastReset = today;
  }
  
  if (type === 'api') {
    stats.apiCalls++;
    stats.totalSummaries++;
  } else if (type === 'cache') {
    stats.cacheHits++;
    stats.totalSummaries++;
  }
  
  await chrome.storage.local.set({ usageStats: stats });
}

async function getCachedPage(url) {
  const cached = pageCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < PAGE_CACHE_DURATION) {
    return cached.content;
  }
  
  try {
    const storageKey = `page_${simpleHash(url)}`;
    const stored = await chrome.storage.local.get(storageKey);
    if (stored[storageKey] && (Date.now() - stored[storageKey].timestamp) < PAGE_CACHE_DURATION) {
      pageCache.set(url, stored[storageKey]);
      return stored[storageKey].content;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  
  return null;
}

async function setCachedPage(url, content) {
  const cacheData = { content, timestamp: Date.now() };
  pageCache.set(url, cacheData);
  
  try {
    const size = await getStorageSize();
    const MAX_STORAGE = 10 * 1024 * 1024;
    
    if (size > MAX_STORAGE) {
      await clearOldCaches();
    }
    
    const storageKey = `page_${simpleHash(url)}`;
    await chrome.storage.local.set({ [storageKey]: cacheData });
  } catch (error) {
    if (error.message?.includes('quota')) {
      await clearOldCaches();
      try {
        const storageKey = `page_${simpleHash(url)}`;
        await chrome.storage.local.set({ [storageKey]: cacheData });
      } catch (e) {}
    }
  }
}

async function fetchWithTimeout(url, timeout = 2000) {
  if (!isValidUrl(url)) return '';
  
  const cached = await getCachedPage(url);
  if (cached) return cached;
  
  const content = await Promise.race([
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPage', url },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve(response.html);
          } else {
            reject(new Error(response?.error || 'Fetch failed'));
          }
        }
      );
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]).catch(() => '');
  
  if (content) await setCachedPage(url, content);
  return content;
}

async function summarizeResults() {
  if (isProcessing) return;
  
  if (!summarizeBtn) summarizeBtn = document.querySelector('.summarize-btn');
  const btn = summarizeBtn;
  if (!btn) return;
  const originalText = btn.textContent;
  
  isProcessing = true;
  
  try {
    btn.setAttribute('aria-busy', 'true');
    const { flashApiKey, selectedModel, selectedLanguage, summaryFormat, multiSearchEnabled } = await chrome.storage.local.get(['flashApiKey', 'selectedModel', 'selectedLanguage', 'summaryFormat', 'multiSearchEnabled']).catch(error => {
      console.error('Storage error:', error);
      return {};
    });
    
    if (!flashApiKey || !selectedModel) {
      chrome.runtime.sendMessage({ action: 'openPopup' });
      return;
    }
    
    const tabIdResponse = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getTabId' }, resolve));
    const wasAutoKey = tabIdResponse?.tabId ? `wasAuto_${tabIdResponse.tabId}` : null;
    const wasAuto = wasAutoKey ? (await chrome.storage.local.get([wasAutoKey]))[wasAutoKey] : false;
    
    if (wasAuto && wasAutoKey) {
      await chrome.storage.local.remove([wasAutoKey]);
    } else if (multiSearchEnabled && !wasAuto) {
      const query = extractSearchQuery();
      if (!query) {
        alert('No search query found.');
        return;
      }
      chrome.runtime.sendMessage({ action: 'multiSearch', query });
      return;
    }
    
    console.log('Selected model:', selectedModel);
    const model = selectedModel;
    const language = selectedLanguage || 'English';
    const format = summaryFormat || 'brief';
    
    const loadingTranslations = {
      English: { finding: 'Finding sources', fetching: 'Fetching content', analyzing: 'Analyzing', generating: 'Generating summary' },
      Spanish: { finding: 'Buscando fuentes', fetching: 'Obteniendo contenido', analyzing: 'Analizando', generating: 'Generando resumen' },
      French: { finding: 'Recherche de sources', fetching: 'Récupération du contenu', analyzing: 'Analyse', generating: 'Génération du résumé' },
      German: { finding: 'Quellen suchen', fetching: 'Inhalt abrufen', analyzing: 'Analysieren', generating: 'Zusammenfassung erstellen' }
    };
    const loading = loadingTranslations[language] || loadingTranslations.English;
    
    const searchQuery = extractSearchQuery();
    const urls = scrapeGoogleUrls();
    const cacheKey = `${searchQuery}-${urls.join(',')}-${language}-${format}`;
    
    const cached = summaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      await updateStats('cache');
      await displaySummary(cached.markdown, cached.urls, format, language);
      return;
    }
    
    const storageKey = `summary_${simpleHash(cacheKey)}`;
    const stored = await chrome.storage.local.get(storageKey);
    if (stored[storageKey] && (Date.now() - stored[storageKey].timestamp) < CACHE_DURATION) {
      summaryCache.set(cacheKey, stored[storageKey]);
      await updateStats('cache');
      await displaySummary(stored[storageKey].markdown, stored[storageKey].urls, format, language);
      return;
    }
    
    const formatInstructions = {
      detailed: 'Provide a comprehensive summary with detailed explanations, context, examples, and in-depth analysis for each point.',
      brief: 'Provide a brief, concise summary in 3-5 bullet points.',
      keypoints: 'List only the key takeaways as short bullet points.'
    };
    
    let maxTokens, wordLimit;
    switch (format) {
      case 'detailed':
        maxTokens = 15000;
        wordLimit = 2000;
        break;
      case 'keypoints':
        maxTokens = 2000;
        wordLimit = 250;
        break;
      case 'brief':
      default:
        maxTokens = 3000;
        wordLimit = 500;
    }
    
    btn.disabled = true;
    btn.innerHTML = `${loading.finding}<span class="loading-spinner"></span>`;
    const decodedUrls = urls.map(url => url.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    console.log('References:', decodedUrls);
    
    if (urls.length === 0) {
      alert('No search results found to summarize.');
      return;
    }
    
    const MAX_CONCURRENT = 3;
    const pages = [];
    
    for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
      btn.innerHTML = `${loading.fetching} (${i}/${urls.length})<span class="loading-spinner"></span>`;
      const batch = urls.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(batch.map(url => fetchWithTimeout(url)));
      pages.push(...batchResults);
    }
    
    btn.innerHTML = `${loading.analyzing}<span class="loading-spinner"></span>`;
    const extractedContent = pages
      .map(html => cleanHtmlToText(html))
      .filter(text => text.length > 100);
    
    if (extractedContent.length === 0) {
      alert('Could not extract content from search results.');
      return;
    }
    
    btn.innerHTML = `${loading.generating}<span class="loading-spinner"></span>`;
    
    const sources = extractedContent.map((text, i) => `[${i + 1}] ${text}`);
    const prompt = `Query: "${searchQuery}"

Summarize these sources answering the query. ${formatInstructions[format]}

${sources.join('\n\n')}

Format: # Title\n${format === 'detailed' ? '4-6' : '3-5'} bullets with [1][2] citations\nLanguage: ${language}\nMax ${wordLimit} words`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${flashApiKey}`;
    console.log('API URL:', apiUrl.replace(flashApiKey, 'REDACTED'));
    
    const callAPIWithRetry = async (maxRetries = 3, baseDelay = 2000) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'callAPI',
              url: apiUrl,
              body: {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: maxTokens,
                  temperature: 0.2,
                  topP: 0.8,
                  topK: 40
                }
              }
            }, response => {
              console.log('API Response:', response);
              if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response?.success) {
                console.log('API call successful, data:', response.data);
                resolve(response.data);
              } else {
                console.error('API call failed:', response);
                reject(new Error(response?.error || 'API request failed'));
              }
            });
          });
          return response;
        } catch (error) {
          const isOverloaded = error.message.includes('overloaded');
          const isLastAttempt = attempt === maxRetries - 1;
          
          if (isOverloaded && !isLastAttempt) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            btn.innerHTML = `⏳ Retrying in ${Math.ceil(delay/1000)}s<span class="loading-spinner"></span>`;
            await new Promise(resolve => setTimeout(resolve, delay));
            btn.innerHTML = `${loading.generating}<span class="loading-spinner"></span>`;
          } else {
            throw error;
          }
        }
      }
    };
    
    const apiResponse = await callAPIWithRetry();
    await updateStats('api');
    
    const data = apiResponse;
    console.log('API response data:', data);
    console.log('Candidates:', data.candidates);
    
    const finishReason = data.candidates?.[0]?.finishReason;
    let markdown = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   data.candidates?.[0]?.text ||
                   data.text;
    
    console.log('Extracted markdown:', markdown);
    console.log('Finish reason:', finishReason);
    
    if (!markdown) {
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('Response too long. Try using "Brief Summary" format.');
      }
      console.error('No markdown extracted from response');
      console.error('Full response structure:', JSON.stringify(data, null, 2));
      throw new Error('No summary generated');
    }
    
    const refTranslations = {
      English: 'References',
      Spanish: 'Referencias',
      French: 'Références',
      German: 'Referenzen'
    };
    const refTitle = refTranslations[language] || 'References';
    
    if (!markdown.toLowerCase().includes('## references') && !markdown.toLowerCase().includes('## referencias') && !markdown.toLowerCase().includes('## références') && !markdown.toLowerCase().includes('## referenzen')) {
      const references = urls.map((url, i) => `**${i + 1}.** [${url}](${url})`).join('\n\n');
      markdown += `\n\n## ${refTitle}\n\n${references}`;
    }
    
    const cacheData = { markdown, urls, timestamp: Date.now() };
    summaryCache.set(cacheKey, cacheData);
    
    try {
      const size = await getStorageSize();
      const MAX_STORAGE = 10 * 1024 * 1024;
      
      if (size > MAX_STORAGE) {
        await clearOldCaches();
      }
      
      await chrome.storage.local.set({ [storageKey]: cacheData });
    } catch (error) {
      if (error.message?.includes('quota')) {
        await clearOldCaches();
        try {
          await chrome.storage.local.set({ [storageKey]: cacheData });
        } catch (e) {}
      }
    }
    
    cachedSummary = markdown;
    await displaySummary(markdown, urls, format, language);
    
  } catch (error) {
    console.error('Summarization error:', error);
    console.error('Error details:', { name: error.name, message: error.message, stack: error.stack });
    const errorMsg = error.name === 'AbortError' ? 'Request timeout' : error.message;
    alert(`❌ Error: ${errorMsg}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
    btn.setAttribute('aria-busy', 'false');
    isProcessing = false;
  }
}

let nonCriticalCSSLoaded = false;

function loadNonCriticalCSS() {
  if (nonCriticalCSSLoaded) return;
  nonCriticalCSSLoaded = true;
  
  requestIdleCallback(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/content.min.css');
    document.head.appendChild(link);
  }, { timeout: 2000 });
}

async function loadShowdown() {
  if (showdownLoaded) return true;
  if (showdownLoadPromise) return showdownLoadPromise;
  
  showdownLoadPromise = new Promise((resolve) => {
    if (typeof showdown !== 'undefined') {
      showdownLoaded = true;
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('lib/showdown.min.js');
    script.onload = () => {
      showdownLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      console.warn('Showdown failed to load, using plain text fallback');
      resolve(false);
    };
    document.head.appendChild(script);
  });
  
  return showdownLoadPromise;
}

if (typeof document !== 'undefined') {
  let lastKeydownTime = 0;
  const DEBOUNCE_DELAY = 300;
  
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.selectedLanguage) {
        updateButtonLanguage();
      }
    });
  }
  
  chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
    if (chrome.runtime.lastError || !response?.tabId) return;
    const tabKey = `autoSummarize_${response.tabId}`;
    chrome.storage.local.get([tabKey, 'autoSummarizeEnabled', 'multiSearchEnabled'], (result) => {
      const shouldAutoSummarize = result[tabKey] || result.autoSummarizeEnabled;
      if (shouldAutoSummarize) {
        if (result[tabKey]) chrome.storage.local.remove([tabKey]);
        
        const autoTrigger = () => {
          if (isProcessing) return;
          if (result.multiSearchEnabled && !result[tabKey]) {
            const query = extractSearchQuery();
            if (query) chrome.runtime.sendMessage({ action: 'multiSearch', query });
          } else {
            chrome.storage.local.set({ [`wasAuto_${response.tabId}`]: true });
            summarizeResults();
          }
        };
        
        if (document.readyState === 'complete') {
          setTimeout(autoTrigger, 2500);
        } else {
          window.addEventListener('load', () => setTimeout(autoTrigger, 2500), { once: true });
        }
      }
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const now = Date.now();
      if (now - lastKeydownTime > DEBOUNCE_DELAY) {
        lastKeydownTime = now;
        summarizeResults();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestIdleCallback(addSummarizeButton, { timeout: 1000 });
    }, { once: true });
  } else {
    requestIdleCallback(addSummarizeButton, { timeout: 1000 });
  }
  
  requestIdleCallback(() => {
    setInterval(cleanupCaches, 5 * 60 * 1000);
  }, { timeout: 5000 });
  
  window.addEventListener('beforeunload', () => {
    summaryCache.clear();
    pageCache.clear();
  });
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      requestIdleCallback(cleanupCaches, { timeout: 2000 });
    }, { passive: true });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeGoogleUrls, scrapeUrls, detectSearchEngine, cleanHtmlToText, addSummarizeButton, displaySummary, summarizeResults };
}
