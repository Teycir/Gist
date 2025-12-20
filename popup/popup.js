let elements = null;

const translations = {
  English: {
    title: "🚀 Gist Settings",
    apiKey: "🔑 API Key",
    model: "🤖 AI Model",
    language: "🌐 Language",
    format: "📝 Summary Format",
    brief: "🎯 Brief Summary, Fast",
    detailed: "📄 Detailed Summary, Slower",
    multiSearch: "🔍 Multi-Search",
    multiSearchTooltip: "Google + Bing + DuckDuckGo",
    darkMode: "🌙 Dark Mode",
    save: "Save Settings",
    saved: "Saved!",
    apiHelp: "Get API key:",
    howToUse: "How to use:",
    footer: "Google search summarizer, made by",
    github: "View on GitHub",
    todayLabel: "Today",
    todayTooltip: "Summaries generated today",
    totalLabel: "Total",
    totalTooltip: "Total summaries generated",
    cacheLabel: "Instant",
    cacheTooltip: "Instant results from memory",
  },
  Spanish: {
    title: "🚀 Configuración de Gist",
    apiKey: "🔑 Clave API",
    model: "🤖 Modelo de IA",
    language: "🌐 Idioma",
    format: "📝 Formato de Resumen",
    brief: "🎯 Resumen Breve, Rápido",
    detailed: "📄 Resumen Detallado, Más Lento",
    multiSearch: "🔍 Búsqueda Múltiple",
    multiSearchTooltip: "Google + Bing + DuckDuckGo",
    darkMode: "🌙 Modo Oscuro",
    save: "Guardar Configuración",
    saved: "¡Guardado!",
    apiHelp: "Obtener clave API:",
    howToUse: "Cómo usar:",
    footer: "Resumidor de búsqueda de Google, hecho por",
    github: "Ver en GitHub",
    todayLabel: "Hoy",
    todayTooltip: "Resúmenes generados hoy",
    totalLabel: "Total",
    totalTooltip: "Total de resúmenes generados",
    cacheLabel: "Instantáneo",
    cacheTooltip: "Resultados instantáneos desde memoria",
  },
  French: {
    title: "🚀 Paramètres Gist",
    apiKey: "🔑 Clé API",
    model: "🤖 Modèle IA",
    language: "🌐 Langue",
    format: "📝 Format de Résumé",
    brief: "🎯 Résumé Bref, Rapide",
    detailed: "📄 Résumé Détaillé, Plus Lent",
    multiSearch: "🔍 Recherche Multiple",
    multiSearchTooltip: "Google + Bing + DuckDuckGo",
    darkMode: "🌙 Mode Sombre",
    save: "Enregistrer les Paramètres",
    saved: "Enregistré!",
    apiHelp: "Obtenir clé API :",
    howToUse: "Comment utiliser :",
    footer: "Résumeur de recherche Google, créé par",
    github: "Voir sur GitHub",
    todayLabel: "Aujourd'hui",
    todayTooltip: "Résumés générés aujourd'hui",
    totalLabel: "Total",
    totalTooltip: "Total des résumés générés",
    cacheLabel: "Instantané",
    cacheTooltip: "Résultats instantanés depuis la mémoire",
  },
  German: {
    title: "🚀 Gist Einstellungen",
    apiKey: "🔑 API-Schlüssel",
    model: "🤖 KI-Modell",
    language: "🌐 Sprache",
    format: "📝 Zusammenfassungsformat",
    brief: "🎯 Kurze Zusammenfassung, Schnell",
    detailed: "📄 Detaillierte Zusammenfassung, Langsamer",
    multiSearch: "🔍 Multi-Suche",
    multiSearchTooltip: "Google + Bing + DuckDuckGo",
    darkMode: "🌙 Dunkelmodus",
    save: "Einstellungen Speichern",
    saved: "Gespeichert!",
    apiHelp: "API-Schlüssel erhalten:",
    howToUse: "So verwenden:",
    footer: "Google-Suchzusammenfasser, erstellt von",
    github: "Auf GitHub ansehen",
    todayLabel: "Heute",
    todayTooltip: "Heute generierte Zusammenfassungen",
    totalLabel: "Gesamt",
    totalTooltip: "Gesamtzahl der generierten Zusammenfassungen",
    cacheLabel: "Sofort",
    cacheTooltip: "Sofortige Ergebnisse aus dem Speicher",
  },
};

function updateUILanguage(lang) {
  const t = translations[lang] || translations.English;
  const el = (id) => document.getElementById(id);
  const setText = (id, text) => { const elem = el(id); if (elem) elem.textContent = text; };
  const setAttr = (id, attr, val) => { const elem = el(id); if (elem) elem.setAttribute(attr, val); };
  const setTextAndTooltip = (id, text, tooltip) => {
    const elem = el(id);
    if (elem) {
      elem.textContent = text;
      elem.setAttribute('data-tooltip', tooltip);
    }
  };

  setText('settingsTitle', t.title);
  setText('languageLabel', t.language);
  setText('formatLabel', t.format);
  setText('briefOption', t.brief);
  setText('detailedOption', t.detailed);
  setText('darkModeLabel', t.darkMode);
  setText('saveButtonText', t.save);
  setText('openrouterKeyHelpText', t.apiHelp);
  setText('howToUseText', t.howToUse);
  setText('footerMadeBy', t.footer);
  setText('todayLabel', t.todayLabel);
  setText('totalLabel', t.totalLabel);
  setText('cacheLabel', t.cacheLabel);

  setTextAndTooltip('multiSearchLabel', t.multiSearch, t.multiSearchTooltip);

  const githubLink = document.querySelector('.github-link a');
  if (githubLink) githubLink.setAttribute('aria-label', t.github);

  setAttr('todayStat', 'data-tooltip', t.todayTooltip);
  setAttr('totalStat', 'data-tooltip', t.totalTooltip);
  setAttr('cacheStat', 'data-tooltip', t.cacheTooltip);
}

function showStatus(statusMsg, text, type, duration = 3000) {
  statusMsg.textContent = text;
  statusMsg.className = `status-msg ${type}`;
  setTimeout(() => {
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';
  }, duration);
}

function getModelName(modelPath) {
  return modelPath.split('/').pop();
}

function updateModelTooltip(modelPath) {
  if (modelPath && !modelPath.includes('scout')) {
    const tooltip = document.getElementById('openrouterModelTooltip');
    if (tooltip) tooltip.textContent = `🤖 ${getModelName(modelPath)}`;
  }
}

function getElements() {
  if (!elements) {
    elements = {
      openrouterApiKey: document.getElementById("openrouterApiKey"),
      languageSelect: document.getElementById("languageSelect"),
      formatSelect: document.getElementById("formatSelect"),
      multiSearch: document.getElementById("multiSearch"),
      statusMsg: document.getElementById("statusMsg"),
    };
  }
  return elements;
}

async function loadOpenRouterModels(apiKey) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 20) return [];

  const { statusMsg } = getElements();

  try {
    showStatus(statusMsg, 'Loading models...', '');

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    const { selectBestModels } = await import(
      chrome.runtime.getURL("lib/model-selector.js")
    );
    const selected = selectBestModels(data.data, "llama");

    if (!selected.primary) throw new Error("No free Llama models found");

    await chrome.storage.local.set({
      openrouterPrimaryModel: selected.primary,
      openrouterFallbackModels: selected.fallbacks,
    });

    updateModelTooltip(selected.primary);
    if (statusMsg) showStatus(statusMsg, `✓ Model: ${getModelName(selected.primary)}`, 'success', 2000);

    return data.data;
  } catch (error) {
    console.error("Failed to load OpenRouter models:", error);
    if (statusMsg) {
      showStatus(statusMsg, `⚠️ ${error.message}`, 'error', 4000);
    }
    return [];
  }
}

document.getElementById("languageSelect")?.addEventListener("change", (e) => {
  updateUILanguage(e.target.value);
});

document.getElementById("darkMode")?.addEventListener("change", (e) => {
  document.body.classList.toggle("dark", e.target.checked);
  chrome.storage.local.set({ darkMode: e.target.checked });
});

document.getElementById("saveKey")?.addEventListener("click", async () => {
  const {
    openrouterApiKey,
    languageSelect,
    formatSelect,
    multiSearch,
    statusMsg,
  } = getElements();
  if (!statusMsg) return;

  const openrouterKey = openrouterApiKey.value.trim();
  const language = languageSelect.value.trim();
  const format = formatSelect.value.trim();
  const isMultiSearch = multiSearch.checked;
  const isDarkMode = document.getElementById("darkMode").checked;
  const saveBtn = document.getElementById("saveKey");

  if (!openrouterKey || openrouterKey.length < 20) {
    showStatus(statusMsg, "⚠️ Please enter a valid OpenRouter API key", "error");
    openrouterApiKey.style.borderColor = "#c5221f";
    return;
  }

  if (!language) {
    showStatus(statusMsg, "⚠️ Please select a language", "error");
    return;
  }

  if (!format) {
    showStatus(statusMsg, "⚠️ Please select a format", "error");
    return;
  }

  try {
    if (saveBtn) saveBtn.disabled = true;
    showStatus(statusMsg, 'Saving...', '');

    await chrome.storage.local.remove([
      "openrouterPrimaryModel",
      "openrouterFallbackModels",
    ]);
    console.log("Cleared model cache");

    await loadOpenRouterModels(openrouterKey);
    const { openrouterPrimaryModel, openrouterFallbackModels } =
      await chrome.storage.local.get([
        "openrouterPrimaryModel",
        "openrouterFallbackModels",
      ]);

    await chrome.storage.local.set({
      openrouterApiKey: openrouterKey,
      selectedLanguage: languageSelect.value,
      summaryFormat: formatSelect.value || "brief",
      multiSearchEnabled: isMultiSearch,
      darkMode: isDarkMode,
      openrouterPrimaryModel,
      openrouterFallbackModels,
    });

    updateModelTooltip(openrouterPrimaryModel);

    console.log('Saved models:', {
      primary: openrouterPrimaryModel,
      fallbacks: openrouterFallbackModels,
    });

    const t = translations[languageSelect.value] || translations.English;
    showStatus(statusMsg, `✓ ${t.saved}`, "success", 2000);
    openrouterApiKey.classList.add("valid");
    openrouterApiKey.style.borderColor = "";
  } catch (error) {
    console.error("Save error:", error);
    showStatus(statusMsg, "⚠️ Failed to save settings", "error");
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

document.getElementById("openrouterApiKey")?.addEventListener("input", (e) => {
  const key = e.target.value.trim();
  if (key.length >= 20) {
    e.target.classList.add("valid");
    e.target.style.borderColor = "";
  } else {
    e.target.classList.remove("valid");
  }
});

async function loadStats() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(["usageStats"]);
  const stats = data.usageStats || {
    apiCalls: 0,
    cacheHits: 0,
    totalSummaries: 0,
    lastReset: today,
  };

  if (stats.lastReset !== today) {
    stats.apiCalls = 0;
    stats.cacheHits = 0;
    stats.lastReset = today;
    await chrome.storage.local.set({ usageStats: stats });
  }

  const todayTotal = stats.apiCalls + stats.cacheHits;
  const cacheRate = todayTotal > 0 ? Math.round((stats.cacheHits / todayTotal) * 100) : 0;
  const el = (id) => document.getElementById(id);
  const setText = (id, text) => { const elem = el(id); if (elem) elem.textContent = text; };

  setText("todayCount", todayTotal);
  setText("totalCount", stats.totalSummaries);
  setText("cacheHitRate", `${cacheRate}%`);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await chrome.storage.local.get([
        "openrouterApiKey",
        "selectedLanguage",
        "summaryFormat",
        "multiSearchEnabled",
        "darkMode",
      ]);
      const {
        openrouterApiKey,
        selectedLanguage,
        summaryFormat,
        multiSearchEnabled,
        darkMode,
      } = data;
      const {
        openrouterApiKey: openrouterKeyInput,
        languageSelect,
        formatSelect,
        multiSearch,
      } = getElements();

      if (openrouterKeyInput && openrouterApiKey) {
        openrouterKeyInput.value = openrouterApiKey;
        openrouterKeyInput.classList.add("valid");
      }

      if (languageSelect && selectedLanguage) {
        languageSelect.value = selectedLanguage;
        updateUILanguage(selectedLanguage);
      }
      if (formatSelect) formatSelect.value = summaryFormat || "brief";
      if (multiSearch) multiSearch.checked = multiSearchEnabled || false;

      const darkModeCheckbox = document.getElementById("darkMode");
      if (darkModeCheckbox) {
        darkModeCheckbox.checked = darkMode || false;
        if (darkMode) document.body.classList.add("dark");
      }

      await loadStats();

      const { openrouterPrimaryModel } = await chrome.storage.local.get([
        "openrouterPrimaryModel",
      ]);

      updateModelTooltip(openrouterPrimaryModel);
    } catch (error) {
      console.error("DOMContentLoaded error:", error);
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadOpenRouterModels,
    _resetCache: () => {
      elements = null;
    },
  };
}
