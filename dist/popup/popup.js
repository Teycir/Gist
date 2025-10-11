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
    detailed: '📄 Detailed Summary, Slowest',
    keypoints: '⚡ Key Points, Fastest',
    save: 'Save Settings',
    apiHelp: 'Get API key:',
    howToUse: 'How to use:',
    footer: 'Google search summarizer, made by'
  },
  Spanish: {
    title: '🚀 Configuración de Gist',
    apiKey: '🔑 Clave API',
    model: '🤖 Modelo de IA',
    language: '🌐 Idioma',
    format: '📝 Formato de Resumen',
    brief: '🎯 Resumen Breve, Rápido',
    detailed: '📄 Resumen Detallado, Más Lento',
    keypoints: '⚡ Puntos Clave, Más Rápido',
    save: 'Guardar Configuración',
    apiHelp: 'Obtener clave API:',
    howToUse: 'Cómo usar:',
    footer: 'Resumidor de búsqueda de Google, hecho por'
  },
  French: {
    title: '🚀 Paramètres Gist',
    apiKey: '🔑 Clé API',
    model: '🤖 Modèle IA',
    language: '🌐 Langue',
    format: '📝 Format de Résumé',
    brief: '🎯 Résumé Bref, Rapide',
    detailed: '📄 Résumé Détaillé, Plus Lent',
    keypoints: '⚡ Points Clés, Plus Rapide',
    save: 'Enregistrer les Paramètres',
    apiHelp: 'Obtenir clé API :',
    howToUse: 'Comment utiliser :',
    footer: 'Résumeur de recherche Google, créé par'
  },
  German: {
    title: '🚀 Gist Einstellungen',
    apiKey: '🔑 API-Schlüssel',
    model: '🤖 KI-Modell',
    language: '🌐 Sprache',
    format: '📝 Zusammenfassungsformat',
    brief: '🎯 Kurze Zusammenfassung, Schnell',
    detailed: '📄 Detaillierte Zusammenfassung, Langsam',
    keypoints: '⚡ Kernpunkte, Am Schnellsten',
    save: 'Einstellungen Speichern',
    apiHelp: 'API-Schlüssel erhalten:',
    howToUse: 'So verwenden:',
    footer: 'Google-Suchzusammenfasser, erstellt von'
  }
};

function updateUILanguage(lang) {
  const t = translations[lang] || translations.English;
  document.getElementById('settingsTitle').textContent = t.title;
  document.getElementById('apiKeyLabel').textContent = t.apiKey;
  document.getElementById('modelLabel').textContent = t.model;
  document.getElementById('languageLabel').textContent = t.language;
  document.getElementById('formatLabel').textContent = t.format;
  document.getElementById('briefOption').textContent = t.brief;
  document.getElementById('detailedOption').textContent = t.detailed;
  document.getElementById('keypointsOption').textContent = t.keypoints;
  document.getElementById('saveButtonText').textContent = t.save;
  document.getElementById('apiKeyHelpText').textContent = t.apiHelp;
  document.getElementById('howToUseText').textContent = t.howToUse;
  document.getElementById('footerMadeBy').textContent = t.footer;
}

function getElements() {
  if (!elements) {
    elements = {
      apiKey: document.getElementById('apiKey'),
      modelSelect: document.getElementById('modelSelect'),
      languageSelect: document.getElementById('languageSelect'),
      formatSelect: document.getElementById('formatSelect'),
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

async function loadModels(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 39) return [];
  if (cachedModels && constantTimeCompare(cachedApiKey, apiKey)) {
    return cachedModels;
  }
  
  const { modelSelect: select, statusMsg } = getElements();
  if (!select) return [];
  
  try {
    select.disabled = true;
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
      const name = m.displayName.toLowerCase();
      const desc = (m.description || '').toLowerCase();
      return name.includes('flash') && 
             !name.includes('lite') &&
             !name.includes('image') && !name.includes('tts') && 
             !name.includes('vision') && !name.includes('robotics') && 
             !name.includes('computer use') && !name.includes('banana') &&
             !desc.includes('image generation') && !desc.includes('image');
    }).sort((a, b) => {
      const versionA = parseFloat(a.name.match(VERSION_REGEX)?.[1] || 0);
      const versionB = parseFloat(b.name.match(VERSION_REGEX)?.[1] || 0);
      if (versionB !== versionA) return versionB - versionA;
      return (b.version || '').localeCompare(a.version || '');
    }).slice(0, 3) || [];
    
    const fragment = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = models.length ? 'Select a model' : 'No models available';
    fragment.appendChild(placeholder);
    
    if (models.length) {
      models.forEach(m => {
        const option = document.createElement('option');
        option.value = m.name;
        option.textContent = m.displayName.split('(')[0].trim();
        option.dataset.modelId = m.name;
        fragment.appendChild(option);
        console.log('Model loaded:', m.name, '->', m.displayName);
      });
    }
    
    select.innerHTML = '';
    select.appendChild(fragment);
    
    cachedModels = models;
    cachedApiKey = apiKey;
    
    if (statusMsg) {
      statusMsg.textContent = models.length ? `✓ ${models.length} models loaded` : '⚠️ No models found';
      statusMsg.className = models.length ? 'status-msg success' : 'status-msg error';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, 2000);
    }
    
    return models;
  } catch (error) {
    console.error('Failed to load models:', error);
    
    if (select) {
      select.innerHTML = '<option value="">Select a model</option>';
    }
    
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
  } finally {
    if (select) select.disabled = false;
  }
}

document.getElementById('languageSelect')?.addEventListener('change', (e) => {
  updateUILanguage(e.target.value);
});

document.getElementById('saveKey')?.addEventListener('click', async () => {
  const { apiKey, modelSelect, languageSelect, formatSelect, statusMsg } = getElements();
  if (!apiKey || !statusMsg) return;
  
  const key = apiKey.value.trim();
  const model = modelSelect.value.trim();
  const language = languageSelect.value.trim();
  const format = formatSelect.value.trim();
  const saveBtn = document.getElementById('saveKey');
  
  if (!key || key.length < 39 || !/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    statusMsg.textContent = '⚠️ Please enter a valid Google AI API key';
    statusMsg.className = 'status-msg error';
    apiKey.style.borderColor = '#c5221f';
    apiKey.setAttribute('aria-invalid', 'true');
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
    return;
  }
  
  if (!model) {
    statusMsg.textContent = '⚠️ Please select a model';
    statusMsg.className = 'status-msg error';
    modelSelect.style.borderColor = '#c5221f';
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
      modelSelect.style.borderColor = '';
    }, 3000);
    return;
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
    
    console.log('Saving model:', modelSelect.value);
    await chrome.storage.local.set({ 
      flashApiKey: key, 
      selectedModel: modelSelect.value, 
      selectedLanguage: languageSelect.value, 
      summaryFormat: formatSelect.value 
    });
    
    statusMsg.textContent = '✓ Settings saved successfully!';
    statusMsg.className = 'status-msg success';
    apiKey.classList.add('valid');
    apiKey.style.borderColor = '';
    apiKey.setAttribute('aria-invalid', 'false');
    
    setTimeout(() => {
      statusMsg.textContent = '✓ Settings saved! Closing...';
      setTimeout(() => window.close(), 1000);
    }, 1000);
  } catch (error) {
    console.error('Save error:', error);
    statusMsg.textContent = '⚠️ Failed to save settings';
    statusMsg.className = 'status-msg error';
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

document.getElementById('apiKey')?.addEventListener('input', (e) => {
  const key = e.target.value.trim();
  if (key.length >= 39 && /^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    e.target.classList.add('valid');
    e.target.style.borderColor = '';
  } else {
    e.target.classList.remove('valid');
  }
});

document.getElementById('apiKey')?.addEventListener('blur', async (e) => {
  const key = e.target.value.trim();
  if (key && key.length >= 39 && /^AIza[0-9A-Za-z_-]{35}$/.test(key) && !constantTimeCompare(key, cachedApiKey)) {
    await loadModels(key);
  }
});

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const data = await chrome.storage.local.get(['flashApiKey', 'selectedModel', 'selectedLanguage', 'summaryFormat']);
      const { flashApiKey, selectedModel, selectedLanguage, summaryFormat } = data;
      const { apiKey, modelSelect, languageSelect, formatSelect } = getElements();
      
      if (languageSelect && selectedLanguage) {
        languageSelect.value = selectedLanguage;
        updateUILanguage(selectedLanguage);
      }
      if (formatSelect && summaryFormat) formatSelect.value = summaryFormat;
      
      if (flashApiKey && apiKey) {
        apiKey.value = flashApiKey;
        apiKey.classList.add('valid');
        if (modelSelect) {
          const models = await loadModels(flashApiKey);
          if (models.length && selectedModel) {
            modelSelect.value = selectedModel;
          }
        }
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
