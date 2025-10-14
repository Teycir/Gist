const { selectBestModels, selectBestGeminiModels } = require('../lib/model-selector.js');

test('Model selectors isolated', async () => {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
  
  if (!OPENROUTER_KEY && !GOOGLE_KEY) {
    console.log('⚠️  No API keys set, skipping test');
    return;
  }
  
  console.log('🧪 Testing Model Selectors in Isolation\n');
  
  // Test 1: OpenRouter Llama selector
  if (OPENROUTER_KEY) {
    console.log('Test 1: OpenRouter Llama Model Selector');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` }
      });
      if (!response || !response.ok) throw new Error(`API error: ${response?.status}`);
      const data = await response.json();
      const result = selectBestModels(data.data, 'llama');
      
      console.log('  Primary:', result.primary);
      console.log('  Fallbacks:', result.fallbacks);
      
      if (!result.primary) throw new Error('No primary model');
      if (result.fallbacks.length !== 2) throw new Error(`Expected 2 fallbacks, got ${result.fallbacks.length}`);
      if (result.primary.toLowerCase().includes('-r1')) throw new Error('Reasoning model selected');
      
      console.log('  ✅ OpenRouter test passed\n');
    } catch (error) {
      console.error('  ❌ OpenRouter test failed:', error.message);
      throw error;
    }
  }
  
  // Test 2: Gemini selector
  if (GOOGLE_KEY) {
    console.log('Test 2: Gemini Flash Model Selector');
    try {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('key', GOOGLE_KEY);
      const response = await fetch(url.toString());
      if (!response || !response.ok) throw new Error(`API error: ${response?.status}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error.message);
      
      const result = selectBestGeminiModels(data.models);
      
      console.log('  Primary:', result.primary);
      console.log('  Fallbacks:', result.fallbacks);
      
      if (!result.primary) throw new Error('No primary model');
      if (result.fallbacks.length !== 2) throw new Error(`Expected 2 fallbacks, got ${result.fallbacks.length}`);
      
      console.log('  ✅ Gemini test passed\n');
    } catch (error) {
      console.error('  ❌ Gemini test failed:', error.message);
      throw error;
    }
  }
  
  console.log('✅ All isolated tests passed!');
});
