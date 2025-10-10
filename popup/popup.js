let cachedModels = null;
let cachedApiKey = null;
let elements = null;
const VERSION_REGEX = /(\d+\.\d+)/;

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
             !name.includes('image') && !name.includes('tts') && 
             !name.includes('vision') && !name.includes('robotics') && 
             !name.includes('computer use') && !name.includes('banana') &&
             !desc.includes('image generation') && !desc.includes('image');
    }).sort((a, b) => {
      const versionA = parseFloat(a.name.match(VERSION_REGEX)?.[1] || 0);
      const versionB = parseFloat(b.name.match(VERSION_REGEX)?.[1] || 0);
      if (versionB !== versionA) return versionB - versionA;
      return (b.version || '').localeCompare(a.version || '');
    }).slice(0, 5) || [];
    
    const fragment = document.createDocumentFragment();
    if (models.length) {
      models.forEach(m => {
        const option = document.createElement('option');
        option.value = m.name;
        option.textContent = m.displayName.split('(')[0].trim();
        fragment.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models available';
      fragment.appendChild(option);
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
      select.innerHTML = '<option value="">Failed to load models</option>';
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

document.getElementById('saveKey')?.addEventListener('click', async () => {
  const { apiKey, modelSelect, languageSelect, formatSelect, statusMsg } = getElements();
  if (!apiKey || !statusMsg) return;
  
  const key = apiKey.value.trim();
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
  
  try {
    if (saveBtn) saveBtn.disabled = true;
    statusMsg.textContent = 'Saving...';
    statusMsg.className = 'status-msg';
    
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
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
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
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['flashApiKey', 'selectedModel', 'selectedLanguage', 'summaryFormat'], async ({ flashApiKey, selectedModel, selectedLanguage, summaryFormat }) => {
      const { apiKey, modelSelect, languageSelect, formatSelect } = getElements();
      
      if (flashApiKey && apiKey) {
        apiKey.value = flashApiKey;
        if (modelSelect) {
          await loadModels(flashApiKey);
          if (selectedModel) modelSelect.value = selectedModel;
        }
      }
      
      if (selectedLanguage && languageSelect) languageSelect.value = selectedLanguage;
      if (summaryFormat && formatSelect) formatSelect.value = summaryFormat;
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadModels };
}
