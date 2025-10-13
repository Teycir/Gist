/**
 * Real-World Test: Measure actual fetch times on Google search
 * Test URL: https://www.google.com/search?q=who+am+i+now+full+movie+ff
 */

const https = require('https');
const http = require('http');

// Fetch a URL with timeout
function fetchWithTimeout(url, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const time = Date.now() - startTime;
        resolve({ url, time, size: data.length, success: true });
      });
    });
    
    req.on('error', (err) => {
      const time = Date.now() - startTime;
      resolve({ url, time, size: 0, success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, time: timeout, size: 0, success: false, error: 'timeout' });
    });
  });
}

// Sample URLs from typical Google search results
const testUrls = [
  'https://www.imdb.com',
  'https://en.wikipedia.org',
  'https://www.rottentomatoes.com',
  'https://www.metacritic.com',
  'https://www.themoviedb.org',
  'https://www.justwatch.com',
  'https://www.rogerebert.com',
  'https://www.fandango.com',
  'https://www.moviefone.com'
];

// OLD STRATEGY
async function oldStrategy(urls) {
  console.log('\n🔴 OLD STRATEGY: Fetch top 3 URLs with 2s timeout');
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < 3; i++) {
    const result = await fetchWithTimeout(urls[i], 2000);
    results.push(result);
    console.log(`   [${i+1}] ${result.url.slice(0, 40)}... ${result.time}ms ${result.success ? '✓' : '✗'}`);
  }
  
  const totalTime = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  
  console.log(`   Total: ${totalTime}ms (${successful}/3 successful)`);
  return { totalTime, successful, results };
}

// NEW STRATEGY
async function newStrategy(urls) {
  console.log('\n🟢 NEW STRATEGY: Fetch 9 URLs in parallel, take first 3 successful');
  const startTime = Date.now();
  
  const fetchPromises = urls.map(url => fetchWithTimeout(url, 1500));
  const results = [];
  const successful = [];
  
  for (const promise of fetchPromises) {
    const result = await promise;
    results.push(result);
    
    if (result.success && successful.length < 3) {
      successful.push(result);
      console.log(`   [${successful.length}] ${result.url.slice(0, 40)}... ${result.time}ms ✓`);
      
      if (successful.length === 3) {
        const totalTime = Date.now() - startTime;
        console.log(`   Total: ${totalTime}ms (3/3 successful) - STOPPED EARLY`);
        return { totalTime, successful: 3, results: successful };
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`   Total: ${totalTime}ms (${successful.length}/9 successful)`);
  return { totalTime, successful: successful.length, results: successful };
}

// Run comparison
async function runRealWorldTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🌐 REAL-WORLD PERFORMANCE TEST');
  console.log('='.repeat(80));
  console.log('\nTesting with actual HTTP requests to real websites...\n');
  
  const oldResult = await oldStrategy(testUrls);
  const newResult = await newStrategy(testUrls);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS:');
  console.log('='.repeat(80));
  console.log(`\nOLD Strategy: ${oldResult.totalTime}ms (${oldResult.successful} sources)`);
  console.log(`NEW Strategy: ${newResult.totalTime}ms (${newResult.successful} sources)`);
  
  const improvement = ((oldResult.totalTime - newResult.totalTime) / oldResult.totalTime * 100).toFixed(1);
  const speedup = (oldResult.totalTime / newResult.totalTime).toFixed(2);
  
  console.log(`\n✅ Improvement: ${improvement}% faster (${speedup}x speedup)`);
  console.log(`   Time saved: ${oldResult.totalTime - newResult.totalTime}ms`);
  console.log('\n' + '='.repeat(80) + '\n');
}

runRealWorldTest().catch(console.error);
