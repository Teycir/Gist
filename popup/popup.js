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

async function loadModels(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return [];
  if (cachedModels && cachedApiKey === apiKey) {
    return cachedModels;
  }
  
  const { modelSelect: select } = getElements();
  if (!select) return [];
  
  try {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('key', apiKey);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('API request failed');
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
    return models;
  } catch (error) {
    console.error('Failed to load models:', error.message);
    if (select) select.innerHTML = '<option value="">Enter API key first</option>';
    return [];
  }
}

document.getElementById('saveKey')?.addEventListener('click', () => {
  const { apiKey, modelSelect, languageSelect, formatSelect, statusMsg } = getElements();
  if (!apiKey || !statusMsg) return;
  
  const key = apiKey.value.trim();
  
  if (!key || key.length < 20) {
    statusMsg.textContent = '⚠️ Please enter a valid API key';
    statusMsg.className = 'status-msg error';
    apiKey.style.borderColor = '#c5221f';
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
    return;
  }
  
  chrome.storage.local.set({ 
    flashApiKey: key, 
    selectedModel: modelSelect.value, 
    selectedLanguage: languageSelect.value, 
    summaryFormat: formatSelect.value 
  }, () => {
    statusMsg.textContent = '✓ Settings saved successfully!';
    statusMsg.className = 'status-msg success';
    apiKey.classList.add('valid');
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
  });
});

document.getElementById('apiKey')?.addEventListener('input', (e) => {
  const key = e.target.value.trim();
  if (key.length > 20) {
    e.target.classList.add('valid');
    e.target.style.borderColor = '';
  } else {
    e.target.classList.remove('valid');
  }
});

document.getElementById('apiKey')?.addEventListener('blur', (e) => {
  const key = e.target.value.trim();
  if (key && key.length > 20 && key !== cachedApiKey) loadModels(key);
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
