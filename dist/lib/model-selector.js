function selectBestModels(models, preferredFamily = 'llama') {
  const freeModels = models.filter(m => {
    const id = m.id.toLowerCase();
    const isFree = id.includes('free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0;
    const isScout = id.includes('scout');
    return isFree && !isScout;
  });
  
  // Sort: Meta > version > size > instruct
  const sortedModels = freeModels.sort((a, b) => {
    const aId = a.id.toLowerCase();
    const bId = b.id.toLowerCase();
    
    const aMeta = aId.includes('meta');
    const bMeta = bId.includes('meta');
    if (aMeta !== bMeta) return aMeta ? -1 : 1;
    
    const aVer = parseFloat((aId.match(/(\d+\.?\d*)/)?.[1] || '0'));
    const bVer = parseFloat((bId.match(/(\d+\.?\d*)/)?.[1] || '0'));
    if (aVer !== bVer) return bVer - aVer;
    
    const aSize = parseInt((aId.match(/(\d+)b/)?.[1] || '0'));
    const bSize = parseInt((bId.match(/(\d+)b/)?.[1] || '0'));
    if (aSize !== bSize) return bSize - aSize;
    
    const aInstruct = aId.toLowerCase().includes('instruct');
    const bInstruct = bId.toLowerCase().includes('instruct');
    if (aInstruct !== bInstruct) return aInstruct ? -1 : 1;
    
    return a.id.length - b.id.length;
  });
  
  const latestVersion = sortedModels[0] ? parseFloat((sortedModels[0].id.toLowerCase().match(/(\d+\.?\d*)/)?.[1] || '0')) : 0;
  const latestMeta = sortedModels.find(m => {
    const id = m.id.toLowerCase();
    const ver = parseFloat((id.match(/(\d+\.?\d*)/)?.[1] || '0'));
    return id.includes('meta') && ver === latestVersion;
  });
  
  const prevVersion = sortedModels.find(m => {
    const id = m.id.toLowerCase();
    const ver = parseFloat((id.match(/(\d+\.?\d*)/)?.[1] || '0'));
    return ver < latestVersion;
  });
  
  const metaModels = sortedModels.filter(m => m.id.toLowerCase().includes('meta')).slice(0, 3);
  
  const fallbacks = [
    prevVersion?.id,
    ...metaModels.slice(1).map(m => m.id)
  ].filter(Boolean).filter(m => m !== latestMeta?.id).slice(0, 2);
  
  return {
    primary: latestMeta?.id || sortedModels[0]?.id,
    fallbacks
  };
}

function selectBestGeminiModels(models) {
  const flashModels = models.filter(m => {
    if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
    const displayName = m.displayName.toLowerCase();
    return displayName.includes('flash') && !displayName.includes('lite');
  }).sort((a, b) => {
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
  
  const latestVersion = flashModels[0] ? parseFloat((flashModels[0].name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) : 0;
  const latestStable = flashModels.find(m => !m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
  const latestPreview = flashModels.find(m => m.name.toLowerCase().includes('preview') && parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) === latestVersion);
  const prevVersion = flashModels.find(m => parseFloat((m.name.toLowerCase().match(/(\d+\.\d+)/) || ['0'])[0]) < latestVersion);
  
  return {
    primary: latestStable?.name || latestPreview?.name || prevVersion?.name,
    fallbacks: [latestPreview?.name, prevVersion?.name].filter(Boolean).filter(m => m !== (latestStable?.name || latestPreview?.name || prevVersion?.name)).slice(0, 2)
  };
}

// Support both CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { selectBestModels, selectBestGeminiModels };
} else if (typeof window !== 'undefined') {
  window.selectBestModels = selectBestModels;
  window.selectBestGeminiModels = selectBestGeminiModels;
}
