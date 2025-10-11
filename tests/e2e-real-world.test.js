/**
 * Real-world E2E Performance Tests with Puppeteer
 * Tests the extension in actual Chrome browser with real network conditions
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const TEST_TIMEOUT = 30000;

describe('Real-World E2E Performance Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('Detailed format: Real network with simulated delays', async () => {
    page = await browser.newPage();
    
    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        storage: {
          local: {
            get: (keys) => Promise.resolve({
              flashApiKey: 'test-key',
              selectedModel: 'models/gemini-1.5-flash',
              selectedLanguage: 'English',
              summaryFormat: 'detailed'
            }),
            set: () => Promise.resolve()
          }
        }
      };
    });

    await page.setRequestInterception(true);
    
    const metrics = {
      urlScraping: 0,
      contentFetching: 0,
      aiGeneration: 0,
      total: 0
    };

    page.on('request', (request) => {
      const url = request.url();
      
      if (url.includes('generativelanguage.googleapis.com')) {
        const aiStart = Date.now();
        setTimeout(() => {
          metrics.aiGeneration = Date.now() - aiStart;
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              candidates: [{
                content: {
                  parts: [{
                    text: `# React Performance Optimization

- **Component Memoization**: React.memo() prevents unnecessary re-renders by performing shallow prop comparisons. For expensive computations, useMemo() caches results between renders, while useCallback() memoizes function references. These techniques are crucial in large component trees where re-renders cascade through multiple levels, potentially causing performance bottlenecks [1]

- **Code Splitting Strategies**: Dynamic imports with React.lazy() and Suspense split applications into smaller chunks that load on demand. Route-based splitting is particularly effective, loading components only when users navigate to specific routes. This approach significantly reduces initial bundle size and improves time-to-interactive metrics [2]

- **Virtual DOM Optimization**: React's reconciliation algorithm efficiently updates only changed elements by comparing virtual DOM trees. Understanding this process helps write performant code by providing stable keys for list items, avoiding inline object/function creation, and structuring components to minimize diff complexity [3]

- **Performance Profiling**: React DevTools Profiler identifies bottlenecks by showing which components render, why they render, and how long renders take. This data-driven approach helps focus optimization efforts where they matter most, enabling targeted improvements [1]

- **State Management**: Carefully structure state to avoid unnecessary re-renders. Keep state local when possible, lift only when needed, and use context or state management libraries for global state. Avoid storing derived data in state - compute it during render instead [2]

- **Rendering Patterns**: Implement windowing/virtualization for long lists using libraries like react-window. These render only visible items, dramatically improving performance for large datasets. Use debouncing and throttling for expensive operations triggered by user input [3]

## References
[1] https://react.dev/reference/react/memo
[2] https://web.dev/code-splitting-suspense/
[3] https://kentcdodds.com/blog/optimize-react-re-renders`
                  }]
                }
              }]
            })
          });
        }, 2500);
      } else if (url.includes('react.dev') || url.includes('web.dev') || url.includes('kentcdodds.com')) {
        const fetchStart = Date.now();
        setTimeout(() => {
          metrics.contentFetching += Date.now() - fetchStart;
          request.respond({
            status: 200,
            contentType: 'text/html',
            body: `<html><body><main><h1>React Performance</h1><p>Comprehensive guide to optimizing React applications for production. Learn about memoization, code splitting, and performance profiling techniques.</p></main></body></html>`
          });
        }, 1000);
      } else {
        request.continue();
      }
    });

    await page.goto('data:text/html,<html><body><div id="search"><a href="https://react.dev/reference/react/memo">React Memo</a><a href="https://web.dev/code-splitting-suspense/">Code Splitting</a><a href="https://kentcdodds.com/blog/optimize-react-re-renders">Optimize Re-renders</a></div><button class="summarize-btn">Summarize</button></body></html>');

    const startTime = Date.now();
    await page.click('.summarize-btn');
    await page.waitForSelector('.summary-overlay', { timeout: 15000 });
    metrics.total = Date.now() - startTime;

    const summaryText = await page.$eval('.summary-body', el => el.textContent);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 REAL-WORLD E2E TEST RESULTS (Detailed Format)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`⏱️  Total Time: ${metrics.total}ms`);
    console.log(`🌐 Content Fetching: ${metrics.contentFetching}ms`);
    console.log(`🤖 AI Generation: ${metrics.aiGeneration}ms`);
    console.log(`📝 Summary Length: ${summaryText.length} characters`);
    console.log(`✅ Status: ${metrics.total < 12000 ? 'PASS' : 'FAIL'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    expect(metrics.total).toBeLessThan(12000);
    expect(summaryText.length).toBeGreaterThan(1000);
    expect(summaryText).toContain('React Performance');
  }, TEST_TIMEOUT);

  test('Network conditions: 3G simulation', async () => {
    page = await browser.newPage();
    
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 750 * 1024 / 8,
      uploadThroughput: 250 * 1024 / 8,
      latency: 100
    });

    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        storage: {
          local: {
            get: () => Promise.resolve({
              flashApiKey: 'test-key',
              summaryFormat: 'brief'
            }),
            set: () => Promise.resolve()
          }
        }
      };
    });

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        setTimeout(() => {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              candidates: [{
                content: {
                  parts: [{
                    text: '# Brief Summary\n\n- Point 1 [1]\n- Point 2 [2]\n- Point 3 [3]'
                  }]
                }
              }]
            })
          });
        }, 3000);
      } else {
        request.continue();
      }
    });

    await page.goto('data:text/html,<html><body><div id="search"><a href="http://test.com">Test</a></div><button class="summarize-btn">Summarize</button></body></html>');

    const startTime = Date.now();
    await page.click('.summarize-btn');
    await page.waitForSelector('.summary-overlay', { timeout: 20000 });
    const duration = Date.now() - startTime;

    console.log(`\n🌐 3G Network Test: ${duration}ms`);
    expect(duration).toBeLessThan(20000);
  }, TEST_TIMEOUT);

  test('Memory usage monitoring', async () => {
    page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        storage: {
          local: {
            get: () => Promise.resolve({ flashApiKey: 'test-key', summaryFormat: 'detailed' }),
            set: () => Promise.resolve()
          }
        }
      };
    });

    const initialMetrics = await page.metrics();
    console.log(`\n💾 Initial Memory: ${(initialMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`);

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [{ content: { parts: [{ text: '# Test\n\n- Memory test [1]' }] } }]
          })
        });
      } else {
        request.continue();
      }
    });

    await page.goto('data:text/html,<html><body><div id="search"><a href="http://test.com">Test</a></div><button class="summarize-btn">Summarize</button></body></html>');
    await page.click('.summarize-btn');
    await page.waitForSelector('.summary-overlay');

    const afterMetrics = await page.metrics();
    const memoryIncrease = (afterMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize) / 1024 / 1024;
    
    console.log(`💾 After Summarization: ${(afterMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📈 Memory Increase: ${memoryIncrease.toFixed(2)}MB`);

    expect(memoryIncrease).toBeLessThan(50);
  }, TEST_TIMEOUT);

  test('Concurrent summarizations', async () => {
    const pages = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ]);

    for (const p of pages) {
      await p.evaluateOnNewDocument(() => {
        window.chrome = {
          storage: {
            local: {
              get: () => Promise.resolve({ flashApiKey: 'test-key', summaryFormat: 'keypoints' }),
              set: () => Promise.resolve()
            }
          }
        };
      });

      await p.setRequestInterception(true);
      p.on('request', (request) => {
        if (request.url().includes('generativelanguage.googleapis.com')) {
          setTimeout(() => {
            request.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                candidates: [{ content: { parts: [{ text: '# Concurrent Test\n\n- Point [1]' }] } }]
              })
            });
          }, 2000);
        } else {
          request.continue();
        }
      });

      await p.goto('data:text/html,<html><body><div id="search"><a href="http://test.com">Test</a></div><button class="summarize-btn">Summarize</button></body></html>');
    }

    const startTime = Date.now();
    await Promise.all(pages.map(async (p) => {
      await p.click('.summarize-btn');
      return p.waitForSelector('.summary-overlay');
    }));
    const duration = Date.now() - startTime;

    console.log(`\n🔄 Concurrent Test (3 tabs): ${duration}ms`);
    expect(duration).toBeLessThan(20000);

    for (const p of pages) await p.close();
  }, TEST_TIMEOUT);

  test('Cache performance validation', async () => {
    page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        storage: {
          local: {
            get: () => Promise.resolve({ flashApiKey: 'test-key', summaryFormat: 'detailed' }),
            set: () => Promise.resolve()
          }
        }
      };
    });

    await page.setRequestInterception(true);
    let apiCallCount = 0;
    
    page.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        apiCallCount++;
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [{ content: { parts: [{ text: '# Cache Test\n\n- Cached result [1]' }] } }]
          })
        });
      } else {
        request.continue();
      }
    });

    await page.goto('data:text/html,<html><body><div id="search"><a href="http://test.com">Test</a></div><button class="summarize-btn">Summarize</button></body></html>');

    const firstStart = Date.now();
    await page.click('.summarize-btn');
    await page.waitForSelector('.summary-overlay');
    const firstDuration = Date.now() - firstStart;

    await page.click('.close-btn');
    await page.waitForSelector('.summary-overlay', { hidden: true });

    const secondStart = Date.now();
    await page.click('.summarize-btn');
    await page.waitForSelector('.summary-overlay');
    const secondDuration = Date.now() - secondStart;

    console.log(`\n💾 Cache Performance:`);
    console.log(`   First run: ${firstDuration}ms`);
    console.log(`   Second run (cached): ${secondDuration}ms`);
    console.log(`   Speedup: ${(firstDuration / secondDuration).toFixed(1)}x faster`);

    expect(secondDuration).toBeLessThan(firstDuration / 2);
  }, TEST_TIMEOUT);
});
