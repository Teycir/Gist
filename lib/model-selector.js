function selectBestModels(models) {
  // Keep only genuinely free models (prompt cost = 0)
  const freeModels = models.filter(m => {
    const isFree = m.id.toLowerCase().includes(':free') ||
                   m.pricing?.prompt === '0' ||
                   m.pricing?.prompt === 0;
    // Skip image-only, audio, embedding, and moderation models
    const isText = !m.id.toLowerCase().match(/embed|whisper|tts|image|vision-only|moderat/);
    return isFree && isText;
  });

  // Score: prefer larger context + higher token volume (popularity signal)
  const scored = freeModels.map(m => {
    const ctx = m.context_length || 0;
    // context window as capability proxy; bump known reliable providers
    const providerBonus = m.id.startsWith('openrouter/') ? 1e9 : 0;
    return { id: m.id, score: ctx + providerBonus };
  }).sort((a, b) => b.score - a.score);

  const primary = scored[0]?.id || null;
  const fallbacks = scored.slice(1, 4).map(m => m.id).filter(id => id !== primary);

  return { primary, fallbacks };
}

function selectBestGeminiModels(models) {
  const stableModels = models.filter(m => {
    const name = m.name.toLowerCase();
    return !name.includes('flash') &&
           !name.includes('exp') &&
           !name.includes('preview') &&
           !name.includes('vision') &&
           !name.includes('image');
  });

  const sortedModels = stableModels.sort((a, b) => {
    const aVer = parseFloat((a.name.match(/(\d+\.\d+)/)?.[1] || '0'));
    const bVer = parseFloat((b.name.match(/(\d+\.\d+)/)?.[1] || '0'));
    return bVer - aVer;
  });

  return {
    primary: sortedModels[0]?.name || 'models/gemini-2.0-pro',
    fallbacks: sortedModels.slice(1, 3).map(m => m.name)
  };
}

// Expose to window for content script
if (typeof window !== 'undefined') {
  window.selectBestModels = selectBestModels;
  window.selectBestGeminiModels = selectBestGeminiModels;
}

// ES6 export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { selectBestModels, selectBestGeminiModels };
}
