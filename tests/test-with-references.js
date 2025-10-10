const { API_KEY, MODEL } = require('./config');

async function testWithReferences() {
  console.log('=== Test with Hyperlinks and References ===\n');
  
  const query = 'best ways to lose belly fat durably';
  const urls = [
    'https://www.healthline.com/nutrition/20-tips-to-lose-belly-fat',
    'https://www.mayoclinic.org/healthy-lifestyle/weight-loss/in-depth/belly-fat/art-20045809',
    'https://www.webmd.com/diet/features/the-truth-about-belly-fat'
  ];
  
  console.log(`Query: "${query}"`);
  console.log('\nScraping URLs:');
  urls.forEach((url, i) => console.log(`  [${i + 1}] ${url}`));
  console.log();
  
  const fetchPromises = urls.map(url => 
    Promise.race([
      fetch(url).then(r => r.text()),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
    ]).catch(() => '')
  );
  
  const pages = await Promise.all(fetchPromises);
  
  const corpus = pages
    .map((html, i) => {
      const text = cleanHtmlToText(html);
      return text.length > 100 ? `[Source ${i + 1}: ${urls[i]}]\n${text}` : '';
    })
    .filter(text => text)
    .join('\n\n---\n\n');
  
  const references = urls.map((url, i) => `[${i + 1}] ${url}`).join('\n');
  
  console.log('Generating summary with references...\n');
  
  const prompt = `Summarize this information about "${query}". Start with a clear title using # markdown. For EACH key point, cite the specific source using [1], [2], or [3]. Use bullet points and simple language.\n\nContent:\n\n${corpus}`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  
  const data = await response.json();
  let summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (summary && !summary.toLowerCase().includes('## references')) {
    summary += `\n\n## References\n${references.split('\n').map(ref => `${ref}`).join('\n')}`;
  }
  
  console.log('✓ Summary with References:\n');
  console.log(summary);
  console.log('\n' + '='.repeat(60));
  console.log('Scraped URLs (clickable in browser):');
  urls.forEach((url, i) => console.log(`[${i + 1}] ${url}`));
  console.log('\n=== Test completed ===');
}

function cleanHtmlToText(html) {
  const parser = new (require('jsdom').JSDOM)(html);
  const doc = parser.window.document;
  
  ['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript', 'aside', 'form', 'button', 'a'].forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });
  
  ['.ad', '.ads', '.advertisement', '.sidebar', '.menu', '.social', '.share', '.related', '.comments'].forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  const main = doc.querySelector('main, article, [role="main"], .content, .article, .post') || doc.body;
  const text = main?.textContent || '';
  return text.replace(/\s+/g, ' ').slice(0, 5000).trim();
}

testWithReferences().catch(console.error);
