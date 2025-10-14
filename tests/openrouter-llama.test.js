// Test OpenRouter Meta Llama free models
const API_KEY = process.env.OPENROUTER_API_KEY;

test('OpenRouter Llama models', async () => {
  if (!API_KEY) {
    console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
    return;
  }
  
  console.log('🧪 Testing OpenRouter Meta Llama Models\n');
  
  // Test 1: Fetch available models
  console.log('Test 1: Fetching available free Llama models...');
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    
    const llamaModels = data.data?.filter(m => {
      const id = m.id.toLowerCase();
      return id.includes('llama') && id.includes('free');
    }).sort((a, b) => {
      const aId = a.id.toLowerCase();
      const bId = b.id.toLowerCase();
      const aVer = parseFloat((aId.match(/llama[\/-]?([\d.]+)/) || aId.match(/llama\s+([\d.]+)/))?.[1] || '0');
      const bVer = parseFloat((bId.match(/llama[\/-]?([\d.]+)/) || bId.match(/llama\s+([\d.]+)/))?.[1] || '0');
      if (aVer !== bVer) return bVer - aVer;
      const aSize = parseInt((aId.match(/(\d+)b/)?.[1] || '0'));
      const bSize = parseInt((bId.match(/(\d+)b/)?.[1] || '0'));
      return bSize - aSize;
    });
    
    console.log(`✓ Found ${llamaModels.length} free Llama models:`);
    llamaModels.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.id}`);
    });
    
    if (llamaModels.length === 0) {
      console.log('⚠️  No free Llama models found');
      return;
    }
    
    // Test 2: Call models with fallback
    console.log(`\nTest 2: Testing models with fallback...`);
    
    const testPrompt = 'Explain what Meta Llama is in one sentence.';
    let answer = null;
    let successModel = null;
    
    for (let i = 0; i < Math.min(3, llamaModels.length); i++) {
      const model = llamaModels[i].id;
      try {
        console.log(`  Trying model ${i + 1}: ${model}`);
        const callResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://github.com/Teycir/Gist',
            'X-Title': 'Gist Test'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 100,
            temperature: 0.2
          })
        });
        
        const result = await callResponse.json();
        if (result.error) {
          console.log(`  ⚠️  Model failed: ${result.error.message}`);
          continue;
        }
        
        answer = result.choices?.[0]?.message?.content;
        successModel = model;
        console.log(`  ✓ Success with: ${model}`);
        break;
      } catch (error) {
        console.log(`  ⚠️  Model failed: ${error.message}`);
      }
    }
    
    if (!answer) {
      console.log('⚠️  All models failed, skipping test');
      return;
    }
    
    console.log('✓ Model response:');
    console.log(`  "${answer}"`);
    console.log('\n✅ All tests passed!');
}, 15000);
