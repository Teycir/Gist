let cachedSummary = null;
const summaryCache = new Map();
const pageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;
const PAGE_CACHE_DURATION = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 15;
const MAX_PAGE_CACHE_SIZE = 30;
const domParser = new DOMParser();
let showdownConverter = null;
let summarizeBtn = null;
const YOUTUBE_REGEX = /youtube\.com/;
let isProcessing = false;
let conversationHistory = [];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

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
  
  const btn = document.createElement('button');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="24" height="24"><rect x="28" y="20" width="72" height="88" rx="8" fill="#fff"/><rect x="40" y="40" width="48" height="4" rx="2" fill="#667eea" opacity="0.9"/><rect x="40" y="52" width="48" height="4" rx="2" fill="#667eea" opacity="0.9"/><rect x="40" y="64" width="32" height="4" rx="2" fill="#667eea" opacity="0.9"/><path d="M88 76 L92 80 L88 84 M84 80 L92 80" stroke="#ffd700" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="78" cy="72" r="2" fill="#ffd700"/><circle cx="94" cy="72" r="1.5" fill="#ffd700"/><circle cx="94" cy="88" r="1.5" fill="#ffd700"/></svg>';
  btn.className = 'summarize-btn';
  btn.setAttribute('data-tooltip', 'Summarize');
  btn.setAttribute('aria-label', 'Summarize search results with AI');
  btn.onclick = summarizeResults;
  document.body.appendChild(btn);
  summarizeBtn = btn;
  
  updateButtonLanguage();
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
            if (url && !YOUTUBE_REGEX.test(url) && !seen.has(url)) {
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

function cleanHtmlToText(html) {
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
    if (content) return content.textContent.replace(/\s+/g, ' ').slice(0, 2000).trim();
  }
  
  return (doc.body?.textContent || '').replace(/\s+/g, ' ').slice(0, 2000).trim();
}

function displaySummary(markdown, urls, format, language) {
  const overlay = document.createElement('div');
  overlay.className = 'summary-overlay';
  
  const content = document.createElement('div');
  content.className = 'summary-content';
  
  const header = document.createElement('div');
  header.className = 'summary-header';
  
  const translations = {
    English: {
      brief: '🚀 AI Brief Summary',
      detailed: '🚀 AI Detailed Summary',
      keypoints: '🚀 AI Key Points Summary',
      top: 'Top',
      analyzed: 'search results',
      copy: 'Copy',
      save: 'Save',
      share: 'Share',
      close: 'Close',
      shareX: 'Share on X',
      shareLinkedIn: 'Share on LinkedIn',
      shareEmail: 'Share via Email'
    },
    Spanish: {
      brief: '🚀 Resumen Breve de IA',
      detailed: '🚀 Resumen Detallado de IA',
      keypoints: '🚀 Puntos Clave de IA',
      top: 'Top',
      analyzed: 'resultados de búsqueda',
      copy: 'Copiar',
      save: 'Guardar',
      share: 'Compartir',
      close: 'Cerrar',
      shareX: 'Compartir en X',
      shareLinkedIn: 'Compartir en LinkedIn',
      shareEmail: 'Compartir por correo'
    },
    French: {
      brief: '🚀 Résumé Bref IA',
      detailed: '🚀 Résumé Détaillé IA',
      keypoints: '🚀 Points Clés IA',
      top: 'Top',
      analyzed: 'résultats de recherche',
      copy: 'Copier',
      save: 'Enregistrer',
      share: 'Partager',
      close: 'Fermer',
      shareX: 'Partager sur X',
      shareLinkedIn: 'Partager sur LinkedIn',
      shareEmail: 'Partager par e-mail'
    },
    German: {
      brief: '🚀 KI-Kurzzusammenfassung',
      detailed: '🚀 KI-Detaillierte Zusammenfassung',
      keypoints: '🚀 KI-Kernpunkte',
      top: 'Top',
      analyzed: 'Suchergebnisse',
      copy: 'Kopieren',
      save: 'Speichern',
      share: 'Teilen',
      close: 'Schließen',
      shareX: 'Auf X teilen',
      shareLinkedIn: 'Auf LinkedIn teilen',
      shareEmail: 'Per E-Mail teilen'
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
    const filename = `gist_${query}_${timestamp}.md`;
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
  
  actions.appendChild(copyBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);
  
  const body = document.createElement('div');
  body.className = 'summary-body';
  
  if (typeof showdown !== 'undefined') {
    if (!showdownConverter) showdownConverter = new showdown.Converter();
    body.innerHTML = showdownConverter.makeHtml(markdown);
    body.querySelectorAll('a').forEach(link => {
      if (isValidUrl(link.href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'summary-link';
      } else {
        link.removeAttribute('href');
      }
    });
  } else {
    body.textContent = markdown;
  }
  
  content.appendChild(header);
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
  
  followUpInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleFollowUp();
  };
  
  followUpSection.appendChild(conversationDiv);
  followUpSection.appendChild(followUpInput);
  content.appendChild(followUpSection);
  
  overlay.appendChild(content);
  
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  
  document.body.appendChild(overlay);
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
    const MAX_STORAGE = 9 * 1024 * 1024;
    
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

async function fetchWithTimeout(url, timeout = 3000) {
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
  const originalText = btn.textContent;
  
  isProcessing = true;
  
  try {
    btn.setAttribute('aria-busy', 'true');
    const { flashApiKey, selectedModel, selectedLanguage, summaryFormat } = await chrome.storage.local.get(['flashApiKey', 'selectedModel', 'selectedLanguage', 'summaryFormat']).catch(error => {
      console.error('Storage error:', error);
      return {};
    });
    
    if (!flashApiKey || !selectedModel) {
      chrome.runtime.sendMessage({ action: 'openPopup' });
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
      displaySummary(cached.markdown, cached.urls, format, language);
      return;
    }
    
    const storageKey = `summary_${simpleHash(cacheKey)}`;
    const stored = await chrome.storage.local.get(storageKey);
    if (stored[storageKey] && (Date.now() - stored[storageKey].timestamp) < CACHE_DURATION) {
      summaryCache.set(cacheKey, stored[storageKey]);
      displaySummary(stored[storageKey].markdown, stored[storageKey].urls, format, language);
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
    console.log('References:', urls);
    
    if (urls.length === 0) {
      alert('No search results found to summarize.');
      return;
    }
    
    const MAX_CONCURRENT = 2;
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
    const prompt = `Search Query: "${searchQuery}"

Your task: Extract and summarize ONLY the information from these ${extractedContent.length} sources that directly answers or relates to the search query above. Ignore any content that doesn't address the query.

Format: Start with a clear title "# [Title]" then ${format === 'detailed' ? '4-6 detailed bullet points' : '3-5 bullet points'} with [1], [2] citations. ${formatInstructions[format]}

Sources:
${sources.join('\n\n')}

IMPORTANT:
- Write the ENTIRE summary in ${language} language
- Stay focused on answering the search query
- Extract practical, actionable information when the query asks "how to"
- Ignore background information or definitions unless the query specifically asks for them
- Keep summary under ${wordLimit} words
- Use citations [1], [2] to reference sources`;
    
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
                  temperature: 0.3
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
      const MAX_STORAGE = 9 * 1024 * 1024;
      
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
    displaySummary(markdown, urls, format, language);
    
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
    document.addEventListener('DOMContentLoaded', addSummarizeButton, { once: true });
  } else {
    typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(addSummarizeButton) : addSummarizeButton();
  }
  
  setInterval(cleanupCaches, 5 * 60 * 1000);
  
  window.addEventListener('beforeunload', () => {
    summaryCache.clear();
    pageCache.clear();
  });
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(cleanupCaches) : setTimeout(cleanupCaches, 1000);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeGoogleUrls, scrapeUrls, detectSearchEngine, cleanHtmlToText, addSummarizeButton, displaySummary, summarizeResults };
}
