// Model selection and sorting logic

function selectBestGeminiModels(models) {
  if (!models || !Array.isArray(models)) return { primary: null, fallbacks: [] };
  
  const filtered = models.filter(m => {
    if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
    const displayName = m.displayName.toLowerCase();
    const desc = (m.description || '').toLowerCase();
    return displayName.includes('flash') && 
           !displayName.includes('lite') &&
           !displayName.includes('image') && !displayName.includes('tts') && 
           !displayName.includes('vision') && !displayName.includes('robotics') && 
           !displayName.includes('computer use') && !displayName.includes('banana') &&
           !desc.includes('image generation') && !desc.includes('image');
  });
  
  const sorted = filtered.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aVersion = parseFloat((aName.match(/(\d+\.\d+)/) || ['0'])[0]);
    const bVersion = parseFloat((bName.match(/(\d+\.\d+)/) || ['0'])[0]);
    if (aVersion !== bVersion) return bVersion - aVersion;
    const aHasPreview = aName.includes('preview');
    const bHasPreview = bName.includes('preview');
    if (aHasPreview !== bHasPreview) return aHasPreview ? 1 : -1;
    return a.name.length - b.name.length;
  });
  
  if (sorted.length === 0) return { primary: null, fallbacks: [] };
  
  const latestVersion = parseFloat((sorted[0].name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]);
  const latestStable = sorted.find(m => !m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
  const latestPreview = sorted.find(m => m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
  const prevVersion = sorted.find(m => parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) < latestVersion);
  
  const primary = latestStable?.name || latestPreview?.name || prevVersion?.name;
  const fallbacks = [latestPreview?.name, prevVersion?.name].filter(Boolean).filter(m => m !== primary).slice(0, 2);
  
  return { primary, fallbacks };
}

function selectBestModels(models, modelFamily) {
  const familyLower = modelFamily.toLowerCase();
  
  // Filter models by family and free tier, exclude reasoning models
  const filtered = models.filter(m => {
    const id = m.id.toLowerCase();
    return id.includes(familyLower) && id.includes('free') && !id.includes('r1') && !id.includes('deepseek') && !id.includes('distill') && !id.includes('scout');
  });
  
  // Sort by version (descending), then size (descending)
  const sorted = filtered.sort((a, b) => {
    const aId = a.id.toLowerCase();
    const bId = b.id.toLowerCase();
    
    // Extract version number
    const aMatch = aId.match(new RegExp(`${familyLower}[\\/-]?([\\d.]+)`)) || aId.match(new RegExp(`${familyLower}\\s+([\\d.]+)`));
    const bMatch = bId.match(new RegExp(`${familyLower}[\\/-]?([\\d.]+)`)) || bId.match(new RegExp(`${familyLower}\\s+([\\d.]+)`));
    const aVer = parseFloat(aMatch?.[1] || '0');
    const bVer = parseFloat(bMatch?.[1] || '0');
    
    if (aVer !== bVer) return bVer - aVer;
    
    // Extract size (e.g., 70b, 8b)
    const aSize = parseInt((aId.match(/(\d+)b/)?.[1] || '0'));
    const bSize = parseInt((bId.match(/(\d+)b/)?.[1] || '0'));
    
    if (aSize !== bSize) return bSize - aSize;
    
    // Prefer instruct models, avoid reasoning models
    const aInstruct = aId.includes('instruct');
    const bInstruct = bId.includes('instruct');
    if (aInstruct !== bInstruct) return aInstruct ? -1 : 1;
    
    const aReasoning = aId.includes('-r1') || aId.includes('reasoning');
    const bReasoning = bId.includes('-r1') || bId.includes('reasoning');
    if (aReasoning !== bReasoning) return aReasoning ? 1 : -1;
    
    // Prefer shorter names (usually more stable)
    return a.id.length - b.id.length;
  });
  
  if (sorted.length === 0) return { primary: null, fallbacks: [] };
  
  // Get latest version
  const latestVersion = parseFloat(
    (sorted[0].id.toLowerCase().match(new RegExp(`${familyLower}[\\/-]?([\\d.]+)`)) || 
     sorted[0].id.toLowerCase().match(new RegExp(`${familyLower}\\s+([\\d.]+)`)))?.[1] || '0'
  );
  
  // Find largest model with latest version
  const primary = sorted.find(m => {
    const id = m.id.toLowerCase();
    const ver = parseFloat(
      (id.match(new RegExp(`${familyLower}[\\/-]?([\\d.]+)`)) || 
       id.match(new RegExp(`${familyLower}\\s+([\\d.]+)`)))?.[1] || '0'
    );
    return ver === latestVersion;
  });
  
  // Get 2 fallbacks (next best models after primary)
  const fallbacks = sorted
    .filter(m => m.id !== primary?.id)
    .slice(0, 2)
    .map(m => m.id);
  
  return {
    primary: primary?.id || null,
    fallbacks
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { selectBestModels, selectBestGeminiModels };
}
