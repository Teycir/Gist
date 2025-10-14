let cachedModels = null;
let cachedApiKey = null;
let elements = null;
const VERSION_REGEX = /(\d+\.\d+)/;

const translations = {
  English: {
    title: '🚀 Gist Settings',
    apiKey: '🔑 API Key',
    model: '🤖 AI Model',
    language: '🌐 Language',
    format: '📝 Summary Format',
    brief: '🎯 Brief Summary, Fast',
    detailed: '📄 Detailed Summary, Slower',
    multiSearch: '🔍 Multi-Search',
    multiSearchTooltip: 'Google + Bing + DuckDuckGo',
    autoSummarize: '⚡ Auto-Summarize',
    autoSummarizeTooltip: 'Summarize automatically on search',
    darkMode: '🌙 Dark Mode',
    save: 'Save Settings',
    saved: 'Saved!',
    apiHelp: 'Get API key:',
    howToUse: 'How to use:',
    footer: 'Google search summarizer, made by',
    github: 'View on GitHub',
    todayLabel: 'Today',
    todayTooltip: 'Summaries generated today',
    totalLabel: 'Total',
    totalTooltip: 'Total summaries generated',
    cacheLabel: 'Instant',
    cacheTooltip: 'Instant results from memory'
  },
  Spanish: {
    title: '🚀 Configuración de Gist',
    apiKey: '🔑 Clave API',
    model: '🤖 Modelo de IA',
    language: '🌐 Idioma',
    format: '📝 Formato de Resumen',
    brief: '🎯 Resumen Breve, Rápido',
    detailed: '📄 Resumen Detallado, Más Lento',
    multiSearch: '🔍 Búsqueda Múltiple',
    multiSearchTooltip: 'Google + Bing + DuckDuckGo',
    autoSummarize: '⚡ Auto-Resumir',
    autoSummarizeTooltip: 'Resumir automáticamente al buscar',
    darkMode: '🌙 Modo Oscuro',
    save: 'Guardar Configuración',
    saved: '¡Guardado!',
    apiHelp: 'Obtener clave API:',
    howToUse: 'Cómo usar:',
    footer: 'Resumidor de búsqueda de Google, hecho por',
    github: 'Ver en GitHub',
    todayLabel: 'Hoy',
    todayTooltip: 'Resúmenes generados hoy',
    totalLabel: 'Total',
    totalTooltip: 'Total de resúmenes generados',
    cacheLabel: 'Instantáneo',
    cacheTooltip: 'Resultados instantáneos desde memoria'
  },
  French: {
    title: '🚀 Paramètres Gist',
    apiKey: '🔑 Clé API',
    model: '🤖 Modèle IA',
    language: '🌐 Langue',
    format: '📝 Format de Résumé',
    brief: '🎯 Résumé Bref, Rapide',
    detailed: '📄 Résumé Détaillé, Plus Lent',
    multiSearch: '🔍 Recherche Multiple',
    multiSearchTooltip: 'Google + Bing + DuckDuckGo',
    autoSummarize: '⚡ Résumé Auto',
    autoSummarizeTooltip: 'Résumer automatiquement lors de la recherche',
    darkMode: '🌙 Mode Sombre',
    save: 'Enregistrer les Paramètres',
    saved: 'Enregistré!',
    apiHelp: 'Obtenir clé API :',
    howToUse: 'Comment utiliser :',
    footer: 'Résumeur de recherche Google, créé par',
    github: 'Voir sur GitHub',
    todayLabel: "Aujourd'hui",
    todayTooltip: "Résumés générés aujourd'hui",
    totalLabel: 'Total',
    totalTooltip: 'Total des résumés générés',
    cacheLabel: 'Instantané',
    cacheTooltip: 'Résultats instantanés depuis la mémoire'
  },
  German: {
    title: '🚀 Gist Einstellungen',
    apiKey: '🔑 API-Schlüssel',
    model: '🤖 KI-Modell',
    language: '🌐 Sprache',
    format: '📝 Zusammenfassungsformat',
    brief: '🎯 Kurze Zusammenfassung, Schnell',
    detailed: '📄 Detaillierte Zusammenfassung, Langsamer',
    multiSearch: '🔍 Multi-Suche',
    multiSearchTooltip: 'Google + Bing + DuckDuckGo',
    autoSummarize: '⚡ Auto-Zusammenfassung',
    autoSummarizeTooltip: 'Automatisch bei Suche zusammenfassen',
    darkMode: '🌙 Dunkelmodus',
    save: 'Einstellungen Speichern',
    saved: 'Gespeichert!',
    apiHelp: 'API-Schlüssel erhalten:',
    howToUse: 'So verwenden:',
    footer: 'Google-Suchzusammenfasser, erstellt von',
    github: 'Auf GitHub ansehen',
    todayLabel: 'Heute',
    todayTooltip: 'Heute generierte Zusammenfassungen',
    totalLabel: 'Gesamt',
    totalTooltip: 'Gesamtzahl der generierten Zusammenfassungen',
    cacheLabel: 'Sofort',
    cacheTooltip: 'Sofortige Ergebnisse aus dem Speicher'
  }
};

function updateUILanguage(lang) {
  const t = translations[lang] || translations.English;
  const el = (id) => document.getElementById(id);
  
  if (el('settingsTitle')) el('settingsTitle').textContent = t.title;
  if (el('languageLabel')) el('languageLabel').textContent = t.language;
  if (el('formatLabel')) el('formatLabel').textContent = t.format;
  if (el('briefOption')) el('briefOption').textContent = t.brief;
  if (el('detailedOption')) el('detailedOption').textContent = t.detailed;
  
  const multiSearchLabel = el('multiSearchLabel');
  if (multiSearchLabel) {
    multiSearchLabel.textContent = t.multiSearch;
    multiSearchLabel.setAttribute('data-tooltip', t.multiSearchTooltip);
  }
  
  const autoSummarizeLabel = el('autoSummarizeLabel');
  if (autoSummarizeLabel) {
    autoSummarizeLabel.textContent = t.autoSummarize;
    autoSummarizeLabel.setAttribute('data-tooltip', t.autoSummarizeTooltip);
  }
  
  if (el('darkModeLabel')) el('darkModeLabel').textContent = t.darkMode;
  if (el('saveButtonText')) el('saveButtonText').textContent = t.save;
  if (el('googleKeyHelpText')) el('googleKeyHelpText').textContent = t.apiHelp;
  if (el('openrouterKeyHelpText')) el('openrouterKeyHelpText').textContent = t.apiHelp;
  if (el('howToUseText')) el('howToUseText').textContent = t.howToUse;
  if (el('footerMadeBy')) el('footerMadeBy').textContent = t.footer;
  
  const githubLink = document.querySelector('.github-link a');
  if (githubLink) githubLink.setAttribute('aria-label', t.github);
  
  if (el('todayLabel')) el('todayLabel').textContent = t.todayLabel;
  if (el('totalLabel')) el('totalLabel').textContent = t.totalLabel;
  if (el('cacheLabel')) el('cacheLabel').textContent = t.cacheLabel;
  if (el('todayStat')) el('todayStat').setAttribute('data-tooltip', t.todayTooltip);
  if (el('totalStat')) el('totalStat').setAttribute('data-tooltip', t.totalTooltip);
  if (el('cacheStat')) el('cacheStat').setAttribute('data-tooltip', t.cacheTooltip);
}

function getElements() {
  if (!elements) {
    elements = {
      providerSelect: document.getElementById('providerSelect'),
      googleApiKey: document.getElementById('googleApiKey'),
      openrouterApiKey: document.getElementById('openrouterApiKey'),
      languageSelect: document.getElementById('languageSelect'),
      formatSelect: document.getElementById('formatSelect'),
      multiSearch: document.getElementById('multiSearch'),
      autoSummarize: document.getElementById('autoSummarize'),
      statusMsg: document.getElementById('statusMsg')
    };
  }
  return elements;
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function loadOpenRouterModels(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) return [];
  
  const { statusMsg } = getElements();
  
  try {
    if (statusMsg) {
      statusMsg.textContent = 'Loading models...';
      statusMsg.className = 'status-msg';
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    
    const { selectBestModels } = await import(chrome.runtime.getURL('lib/model-selector.js'));
    const selected = selectBestModels(data.data, 'llama');
    
    if (!selected.primary) throw new Error('No free Llama models found');
    
    await chrome.storage.local.set({ 
      openrouterPrimaryModel: selected.primary,
      openrouterFallbackModels: selected.fallbacks
    });
    
    if (statusMsg) {
      statusMsg.textContent = `✓ Model: ${selected.primary.split('/').pop()}`;
      statusMsg.className = 'status-msg success';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, 2000);
    }
    
    return data.data;
  } catch (error) {
    console.error('Failed to load OpenRouter models:', error);
    if (statusMsg) {
      statusMsg.textContent = `⚠️ ${error.message}`;
      statusMsg.className = 'status-msg error';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, 4000);
    }
    return [];
  }
}

async function loadModels(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 39) return [];
  if (cachedModels && constantTimeCompare(cachedApiKey, apiKey)) {
    return cachedModels;
  }
  
  const { statusMsg } = getElements();
  
  try {
    if (statusMsg) {
      statusMsg.textContent = 'Loading models...';
      statusMsg.className = 'status-msg';
    }
    
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('key', apiKey);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    const data = await response.json();
    
    const models = data.models?.filter(m => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      const displayName = m.displayName.toLowerCase();
      const modelName = m.name.toLowerCase();
      const desc = (m.description || '').toLowerCase();
      return displayName.includes('flash') && 
             !displayName.includes('lite') &&
             !displayName.includes('image') && !displayName.includes('tts') && 
             !displayName.includes('vision') && !displayName.includes('robotics') && 
             !displayName.includes('computer use') && !displayName.includes('banana') &&
             !desc.includes('image generation') && !desc.includes('image');
    }).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aHasPreview = aName.includes('preview');
      const bHasPreview = bName.includes('preview');
      const aVersion = parseFloat((aName.match(/(\d+\.\d+)/) || ['0'])[0]);
      const bVersion = parseFloat((bName.match(/(\d+\.\d+)/) || ['0'])[0]);
      if (aVersion !== bVersion) return bVersion - aVersion;
      if (aHasPreview !== bHasPreview) return aHasPreview ? 1 : -1;
      return a.name.length - b.name.length;
    }) || [];
    
    const latestVersion = models[0] ? parseFloat((models[0].name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) : 0;
    const latestStable = models.find(m => !m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
    const latestPreview = models.find(m => m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
    const prevVersion = models.find(m => parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) < latestVersion);
    
    const primary = latestStable?.name || latestPreview?.name || prevVersion?.name;
    const fallbacks = [latestPreview?.name, prevVersion?.name].filter(Boolean).filter(m => m !== primary).slice(0, 2);
    
    cachedModels = models;
    cachedApiKey = apiKey;
    
    await chrome.storage.local.set({ 
      primaryModel: primary,
      fallbackModels: fallbacks
    });
    console.log('Primary model:', primary, 'Fallbacks:', fallbacks);
    
    if (statusMsg) {
      statusMsg.textContent = primary ? `✓ Model loaded` : '⚠️ No models found';
      statusMsg.className = primary ? 'status-msg success' : 'status-msg error';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, 2000);
    }
    
    return models;
  } catch (error) {
    console.error('Failed to load models:', error);
    
    if (statusMsg) {
      const isAbort = error.name === 'AbortError';
      statusMsg.textContent = isAbort ? '⚠️ Request timeout' : `⚠️ ${error.message}`;
      statusMsg.className = 'status-msg error';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, 4000);
    }
    
    return [];
  }
}

document.getElementById('languageSelect')?.addEventListener('change', (e) => {
  updateUILanguage(e.target.value);
});

document.getElementById('darkMode')?.addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
  chrome.storage.local.set({ darkMode: e.target.checked });
});

document.getElementById('providerSelect')?.addEventListener('change', (e) => {
  const isOpenRouter = e.target.value === 'openrouter';
  document.getElementById('googleKeyGroup').style.display = isOpenRouter ? 'none' : 'block';
  document.getElementById('openrouterKeyGroup').style.display = isOpenRouter ? 'block' : 'none';
  document.getElementById('googleKeyHelp').style.display = isOpenRouter ? 'none' : 'block';
  document.getElementById('openrouterKeyHelp').style.display = isOpenRouter ? 'block' : 'none';
});

document.getElementById('saveKey')?.addEventListener('click', async () => {
  const { providerSelect, googleApiKey, openrouterApiKey, languageSelect, formatSelect, multiSearch, autoSummarize, statusMsg } = getElements();
  if (!statusMsg) return;
  
  const provider = providerSelect.value;
  const googleKey = googleApiKey.value.trim();
  const openrouterKey = openrouterApiKey.value.trim();
  const language = languageSelect.value.trim();
  const format = formatSelect.value.trim();
  const isMultiSearch = multiSearch.checked;
  const isAutoSummarize = autoSummarize.checked;
  const isDarkMode = document.getElementById('darkMode').checked;
  const saveBtn = document.getElementById('saveKey');
  
  if (provider === 'google') {
    if (!googleKey || googleKey.length < 39 || !/^AIza[0-9A-Za-z_-]{35}$/.test(googleKey)) {
      statusMsg.textContent = '⚠️ Please enter a valid Google AI API key';
      statusMsg.className = 'status-msg error';
      googleApiKey.style.borderColor = '#c5221f';
      setTimeout(() => { statusMsg.textContent = ''; statusMsg.className = 'status-msg'; }, 3000);
      return;
    }
  } else {
    if (!openrouterKey || openrouterKey.length < 20) {
      statusMsg.textContent = '⚠️ Please enter a valid OpenRouter API key';
      statusMsg.className = 'status-msg error';
      openrouterApiKey.style.borderColor = '#c5221f';
      setTimeout(() => { statusMsg.textContent = ''; statusMsg.className = 'status-msg'; }, 3000);
      return;
    }
  }
  
  if (!language) {
    statusMsg.textContent = '⚠️ Please select a language';
    statusMsg.className = 'status-msg error';
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
    return;
  }
  
  if (!format) {
    statusMsg.textContent = '⚠️ Please select a format';
    statusMsg.className = 'status-msg error';
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
    return;
  }
  
  try {
    if (saveBtn) saveBtn.disabled = true;
    statusMsg.textContent = 'Saving...';
    statusMsg.className = 'status-msg';
    
    // Clear model cache on settings save
    await chrome.storage.local.remove(['primaryModel', 'fallbackModels', 'openrouterPrimaryModel', 'openrouterFallbackModels']);
    console.log('Cleared model cache');
    
    // Load fresh models with updated sorting
    let primary, fallbacks;
    if (provider === 'google') {
      await loadModels(googleKey);
      const { primaryModel, fallbackModels } = await chrome.storage.local.get(['primaryModel', 'fallbackModels']);
      primary = primaryModel;
      fallbacks = fallbackModels;
    } else {
      await loadOpenRouterModels(openrouterKey);
      const { openrouterPrimaryModel, openrouterFallbackModels } = await chrome.storage.local.get(['openrouterPrimaryModel', 'openrouterFallbackModels']);
      primary = openrouterPrimaryModel;
      fallbacks = openrouterFallbackModels;
    }
    
    const storageData = { 
      aiProvider: provider,
      googleApiKey: googleKey,
      openrouterApiKey: openrouterKey,
      flashApiKey: provider === 'google' ? googleKey : openrouterKey,
      selectedLanguage: languageSelect.value, 
      summaryFormat: formatSelect.value || 'brief',
      multiSearchEnabled: isMultiSearch,
      autoSummarizeEnabled: isAutoSummarize,
      darkMode: isDarkMode
    };
    
    if (provider === 'google') {
      storageData.primaryModel = primary;
      storageData.fallbackModels = fallbacks;
    } else {
      storageData.openrouterPrimaryModel = primary;
      storageData.openrouterFallbackModels = fallbacks;
    }
    
    await chrome.storage.local.set(storageData);
    
    // Update tooltips with loaded models
    if (provider === 'google' && primary) {
      const modelName = primary.split('/').pop();
      document.getElementById('googleModelTooltip').textContent = `🤖 ${modelName}`;
    } else if (provider === 'openrouter' && primary) {
      const modelName = primary.split('/').pop();
      document.getElementById('openrouterModelTooltip').textContent = `🤖 ${modelName}`;
    }
    
    console.log('Saved models:', { primary, fallbacks });
    
    const t = translations[languageSelect.value] || translations.English;
    statusMsg.textContent = `✓ ${t.saved}`;
    statusMsg.className = 'status-msg success';
    if (provider === 'google') {
      googleApiKey.classList.add('valid');
      googleApiKey.style.borderColor = '';
    } else {
      openrouterApiKey.classList.add('valid');
      openrouterApiKey.style.borderColor = '';
    }
    
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 2000);
  } catch (error) {
    console.error('Save error:', error);
    statusMsg.textContent = '⚠️ Failed to save settings';
    statusMsg.className = 'status-msg error';
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

document.getElementById('googleApiKey')?.addEventListener('input', (e) => {
  const key = e.target.value.trim();
  if (key.length >= 39 && /^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    e.target.classList.add('valid');
    e.target.style.borderColor = '';
  } else {
    e.target.classList.remove('valid');
  }
});

document.getElementById('openrouterApiKey')?.addEventListener('input', (e) => {
  const key = e.target.value.trim();
  if (key.length >= 20) {
    e.target.classList.add('valid');
    e.target.style.borderColor = '';
  } else {
    e.target.classList.remove('valid');
  }
});



async function loadStats() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['usageStats']);
  const stats = data.usageStats || { apiCalls: 0, cacheHits: 0, totalSummaries: 0, lastReset: today };
  
  if (stats.lastReset !== today) {
    stats.apiCalls = 0;
    stats.cacheHits = 0;
    stats.lastReset = today;
    await chrome.storage.local.set({ usageStats: stats });
  }
  
  const todayTotal = stats.apiCalls + stats.cacheHits;
  const cacheRate = todayTotal > 0 ? Math.round((stats.cacheHits / todayTotal) * 100) : 0;
  
  document.getElementById('todayCount').textContent = todayTotal;
  document.getElementById('totalCount').textContent = stats.totalSummaries;
  document.getElementById('cacheHitRate').textContent = `${cacheRate}%`;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const data = await chrome.storage.local.get(['aiProvider', 'googleApiKey', 'openrouterApiKey', 'selectedLanguage', 'summaryFormat', 'multiSearchEnabled', 'autoSummarizeEnabled', 'darkMode']);
      const { aiProvider, googleApiKey, openrouterApiKey, selectedLanguage, summaryFormat, multiSearchEnabled, autoSummarizeEnabled, darkMode } = data;
      const { providerSelect, googleApiKey: googleKeyInput, openrouterApiKey: openrouterKeyInput, languageSelect, formatSelect, multiSearch, autoSummarize } = getElements();
      
      if (providerSelect) {
        providerSelect.value = aiProvider || 'google';
        const isOpenRouter = (aiProvider || 'google') === 'openrouter';
        document.getElementById('googleKeyGroup').style.display = isOpenRouter ? 'none' : 'block';
        document.getElementById('openrouterKeyGroup').style.display = isOpenRouter ? 'block' : 'none';
        document.getElementById('googleKeyHelp').style.display = isOpenRouter ? 'none' : 'block';
        document.getElementById('openrouterKeyHelp').style.display = isOpenRouter ? 'block' : 'none';
      }
      
      if (googleKeyInput && googleApiKey) {
        googleKeyInput.value = googleApiKey;
        googleKeyInput.classList.add('valid');
      }
      
      if (openrouterKeyInput && openrouterApiKey) {
        openrouterKeyInput.value = openrouterApiKey;
        openrouterKeyInput.classList.add('valid');
      }
      
      if (languageSelect && selectedLanguage) {
        languageSelect.value = selectedLanguage;
        updateUILanguage(selectedLanguage);
      }
      if (formatSelect) formatSelect.value = summaryFormat || 'brief';
      if (multiSearch) multiSearch.checked = multiSearchEnabled || false;
      if (autoSummarize) autoSummarize.checked = autoSummarizeEnabled || false;
      
      const darkModeCheckbox = document.getElementById('darkMode');
      if (darkModeCheckbox) {
        darkModeCheckbox.checked = darkMode || false;
        if (darkMode) document.body.classList.add('dark');
      }
      
      await loadStats();
      
      // Load and display models in tooltips
      const { primaryModel, openrouterPrimaryModel } = await chrome.storage.local.get(['primaryModel', 'openrouterPrimaryModel']);
      
      if (primaryModel) {
        const modelName = primaryModel.split('/').pop();
        document.getElementById('googleModelTooltip').textContent = `🤖 ${modelName}`;
      }
      
      if (openrouterPrimaryModel &&  !openrouterPrimaryModel.includes('scout')) {
        const modelName = openrouterPrimaryModel.split('/').pop();
        document.getElementById('openrouterModelTooltip').textContent = `🤖 ${modelName}`;
      }
    } catch (error) {
      console.error('DOMContentLoaded error:', error);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    loadModels,
    _resetCache: () => {
      elements = null;
      cachedModels = null;
      cachedApiKey = null;
    }
  };
}
