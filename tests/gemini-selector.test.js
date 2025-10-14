const { selectBestGeminiModels } = require('../lib/model-selector.js');

test('Gemini model selector', async () => {
  const API_KEY = process.env.GOOGLE_API_KEY;
  
  if (!API_KEY) {
    console.log('⚠️  GOOGLE_API_KEY not set, skipping test');
    return;
  }
  
  console.log('🧪 Testing Gemini Model Selector\n');
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('key', API_KEY);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('Test: Selecting best Gemini Flash models');
    const result = selectBestGeminiModels(data.models);
    
    console.log('Primary:', result.primary);
    console.log('Fallbacks:', result.fallbacks);
    
    if (!result.primary) {
      throw new Error('No primary Gemini model selected');
    }
    
    if (result.fallbacks.length !== 2) {
      throw new Error(`Expected 2 fallbacks, got ${result.fallbacks.length}`);
    }
    
    console.log('\n✅ Gemini selector test passed!');
});
