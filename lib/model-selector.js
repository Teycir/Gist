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

// ES6 export
export { selectBestModels, selectBestGeminiModels };
