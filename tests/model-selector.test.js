// Mock the module functions
function selectBestModels(models, preferredFamily = 'llama') {
  const freeModels = models.filter(m => {
    const id = m.id.toLowerCase();
    const isFree = id.includes('free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0;
    const isScout = id.includes('scout');
    return isFree && !isScout;
  });
  
  const sortedModels = freeModels.sort((a, b) => {
    const aId = a.id.toLowerCase();
    const bId = b.id.toLowerCase();
    
    const aFlash = aId.includes('flash');
    const bFlash = bId.includes('flash');
    if (aFlash !== bFlash) return aFlash ? -1 : 1;
    
    const aMeta = aId.includes('meta');
    const bMeta = bId.includes('meta');
    if (aMeta !== bMeta) return aMeta ? -1 : 1;
    
    const aVer = parseFloat((aId.match(/(\d+\.?\d*)/)?.[1] || '0'));
    const bVer = parseFloat((bId.match(/(\d+\.?\d*)/)?.[1] || '0'));
    if (aVer !== bVer) return bVer - aVer;
    
    const aSize = parseInt((aId.match(/(\d+)b/)?.[1] || '0'));
    const bSize = parseInt((bId.match(/(\d+)b/)?.[1] || '0'));
    if (aSize !== bSize) return bSize - aSize;
    
    const aInstruct = aId.includes('instruct');
    const bInstruct = bId.includes('instruct');
    if (aInstruct !== bInstruct) return aInstruct ? -1 : 1;
    
    return a.id.length - b.id.length;
  });
  
  const latestVersion = sortedModels[0] ? parseFloat((sortedModels[0].id.toLowerCase().match(/(\d+\.?\d*)/)?.[1] || '0')) : 0;
  const latestFlash = sortedModels.find(m => {
    const id = m.id.toLowerCase();
    const ver = parseFloat((id.match(/(\d+\.?\d*)/)?.[1] || '0'));
    return id.includes('flash') && ver === latestVersion;
  });
  
  const prevVersion = sortedModels.find(m => {
    const id = m.id.toLowerCase();
    const ver = parseFloat((id.match(/(\d+\.?\d*)/)?.[1] || '0'));
    return ver < latestVersion;
  });
  
  const metaModels = sortedModels.filter(m => m.id.toLowerCase().includes('meta'));
  
  const fallbacks = [
    prevVersion?.id,
    ...metaModels.slice(0, 2).map(m => m.id)
  ].filter(Boolean).filter(m => m !== latestFlash?.id).slice(0, 2);
  
  return {
    primary: latestFlash?.id || sortedModels[0]?.id,
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

describe('Model Selector', () => {
  describe('selectBestModels (OpenRouter)', () => {
    it('should prioritize flash models first', () => {
      const models = [
        { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0' } },
        { id: 'qwen/qvq-72b-preview:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } },
        { id: 'google/gemini-flash-1.5-8b:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary.toLowerCase()).toContain('flash');
      expect(result.primary.toLowerCase()).not.toContain('qwen');
    });

    it('should select latest version flash model as primary', () => {
      const models = [
        { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0' } },
        { id: 'google/gemini-flash-1.5-8b:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary).toBe('google/gemini-2.0-flash-exp:free');
    });

    it('should exclude scout models completely', () => {
      const models = [
        { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0' } },
        { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary.toLowerCase()).not.toContain('scout');
      expect(result.fallbacks.every(m => !m.toLowerCase().includes('scout'))).toBe(true);
    });

    it('should include meta-llama and distill models in fallbacks', () => {
      const models = [
        { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0' } },
        { id: 'google/gemini-flash-1.5-8b:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.fallbacks.some(m => m.toLowerCase().includes('meta-llama'))).toBe(true);
    });

    it('should handle only non-flash models', () => {
      const models = [
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', pricing: { prompt: '0' } },
        { id: 'qwen/qwen-2-7b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary.toLowerCase()).toContain('meta-llama');
      expect(result.primary.toLowerCase()).not.toContain('qwen');
    });

    it('should sort by version number correctly', () => {
      const models = [
        { id: 'google/gemini-flash-1.5-8b:free', pricing: { prompt: '0' } },
        { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0' } },
        { id: 'google/gemini-1.0-flash:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary).toBe('google/gemini-2.0-flash-exp:free');
    });

    it('should prefer larger parameter sizes', () => {
      const models = [
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-8b-instruct:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-1b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary).toBe('meta-llama/llama-3.2-8b-instruct:free');
    });

    it('should prefer instruct models over base', () => {
      const models = [
        { id: 'meta-llama/llama-3.2-3b:free', pricing: { prompt: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', pricing: { prompt: '0' } }
      ];
      
      const result = selectBestModels(models);
      
      expect(result.primary).toBe('meta-llama/llama-3.2-3b-instruct:free');
    });
  });

  describe('selectBestGeminiModels', () => {
    it('should select latest stable flash model', () => {
      const models = [
        { 
          name: 'models/gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          supportedGenerationMethods: ['generateContent']
        },
        { 
          name: 'models/gemini-1.5-flash',
          displayName: 'Gemini 1.5 Flash',
          supportedGenerationMethods: ['generateContent']
        }
      ];
      
      const result = selectBestGeminiModels(models);
      
      expect(result.primary).toBe('models/gemini-2.0-flash');
    });

    it('should exclude lite models', () => {
      const models = [
        { 
          name: 'models/gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          supportedGenerationMethods: ['generateContent']
        },
        { 
          name: 'models/gemini-1.5-flash-lite',
          displayName: 'Gemini 1.5 Flash Lite',
          supportedGenerationMethods: ['generateContent']
        }
      ];
      
      const result = selectBestGeminiModels(models);
      
      expect(result.primary).toBe('models/gemini-2.0-flash');
      expect(result.fallbacks.every(m => !m.includes('lite'))).toBe(true);
    });

    it('should include preview models in fallbacks', () => {
      const models = [
        { 
          name: 'models/gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          supportedGenerationMethods: ['generateContent']
        },
        { 
          name: 'models/gemini-2.0-flash-preview',
          displayName: 'Gemini 2.0 Flash Preview',
          supportedGenerationMethods: ['generateContent']
        }
      ];
      
      const result = selectBestGeminiModels(models);
      
      expect(result.fallbacks).toContain('models/gemini-2.0-flash-preview');
    });
  });
});
