const { selectBestModels } = require('../lib/model-selector.js');

test('Model selector', async () => {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!API_KEY) {
    console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
    return;
  }
  
  console.log('🧪 Testing Model Selector\n');
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    const data = await response.json();
    
    // Test with Llama models
    console.log('Test 1: Selecting best Llama models');
    const llamaResult = selectBestModels(data.data, 'llama');
    
    console.log('Primary:', llamaResult.primary);
    console.log('Fallbacks:', llamaResult.fallbacks);
    
    if (!llamaResult.primary) {
      throw new Error('No primary Llama model selected');
    }
    
    if (llamaResult.fallbacks.length !== 2) {
      throw new Error(`Expected 2 fallbacks, got ${llamaResult.fallbacks.length}`);
    }
    
    console.log('\n✅ Model selector test passed!');
});
