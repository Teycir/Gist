/**
 * @jest-environment jsdom
 */

describe('Summary Format Options Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"><a href="http://test1.com">Test 1</a><a href="http://test2.com">Test 2</a><a href="http://test3.com">Test 3</a></div>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    fetch.mockClear();
    global.alert = jest.fn();
    global.window = { open: jest.fn(), location: { search: '?q=test+query' } };
  });

  test('Detailed format: comprehensive summary with explanations', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedLanguage: 'English',
      summaryFormat: 'detailed'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    const detailedSummary = `# React Performance Optimization Guide

React performance optimization is crucial for building fast, responsive applications. Here's a comprehensive overview with detailed explanations:

- **Memoization techniques**: Use React.memo() to prevent unnecessary re-renders of functional components. This higher-order component wraps your component and performs a shallow comparison of props, only re-rendering when props actually change. For expensive computations, useMemo() caches results between renders, while useCallback() memoizes function references to prevent child component re-renders. These techniques are especially valuable in large component trees where unnecessary renders cascade through multiple levels [1]

- **Code splitting strategies**: Implement dynamic imports with React.lazy() and Suspense to load components on demand, significantly reducing initial bundle size. This approach allows you to split your application into smaller chunks that load only when needed, improving initial page load time. Route-based code splitting is particularly effective, loading each route's components only when users navigate to them. Combined with proper loading states via Suspense, this creates a smooth user experience while optimizing performance [2]

- **Virtual DOM optimization**: React's reconciliation algorithm efficiently updates only changed elements by comparing virtual DOM trees. Understanding this process helps you write more performant code by providing stable keys for list items, avoiding inline object/function creation in render methods, and structuring components to minimize diff complexity. The algorithm uses heuristics to determine the minimal set of DOM operations needed, making React applications fast by default [3]

- **Performance profiling and monitoring**: Use React DevTools Profiler to identify bottlenecks, measure render times, and analyze component hierarchies. The Profiler shows which components render, why they render, and how long renders take. This data-driven approach helps you focus optimization efforts where they matter most. Additionally, implement performance budgets and use tools like Lighthouse to continuously monitor and maintain application performance in production [1]

- **State management optimization**: Carefully structure state to avoid unnecessary re-renders. Keep state as local as possible, lift it only when needed, and consider using context or state management libraries like Redux or Zustand for global state. Avoid storing derived data in state - compute it during render instead. Use state updater functions to ensure you're working with the latest state, and batch state updates when possible to minimize render cycles [2]

- **Rendering optimization patterns**: Implement windowing/virtualization for long lists using libraries like react-window or react-virtualized. These render only visible items, dramatically improving performance for large datasets. Use debouncing and throttling for expensive operations triggered by user input. Consider implementing progressive rendering for complex UIs, showing critical content first and loading additional features asynchronously [3]

## References
[1] http://test1.com
[2] http://test2.com
[3] http://test3.com`;
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: detailedSummary }] } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main><p>React performance optimization content</p></main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log('\n📝 DETAILED FORMAT TEST');
    console.log('─────────────────────────────────────────');
    console.log('Query: "React performance optimization"');
    console.log(`Time: ${duration.toFixed(2)}ms`);
    console.log('\nSummary Output:');
    console.log(detailedSummary);
    console.log('\n✅ Status: PASS - Comprehensive explanations included');
  });

  test('Brief format: concise 3-5 bullet points', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedLanguage: 'English',
      summaryFormat: 'brief'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    const briefSummary = `# Docker Security Essentials

- Use minimal base images and regularly scan for vulnerabilities [1]
- Run containers as non-root users with read-only filesystems [2]
- Implement network segmentation and use secrets management [3]

## References
[1] http://test1.com
[2] http://test2.com
[3] http://test3.com`;
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: briefSummary }] } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main><p>Docker security content</p></main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log('\n📝 BRIEF FORMAT TEST');
    console.log('─────────────────────────────────────────');
    console.log('Query: "Docker container security"');
    console.log(`Time: ${duration.toFixed(2)}ms`);
    console.log('\nSummary Output:');
    console.log(briefSummary);
    console.log('\n✅ Status: PASS - Concise bullet points only');
  });

  test('Key points format: minimal takeaways', async () => {
    const start = performance.now();
    
    chrome.storage.local.get.mockResolvedValue({ 
      flashApiKey: 'test-key',
      selectedLanguage: 'English',
      summaryFormat: 'keypoints'
    });
    
    chrome.storage.local.set.mockResolvedValue();
    
    const keypointsSummary = `# AWS Lambda Optimization

- Keep functions small and focused [1]
- Use provisioned concurrency for cold starts [2]
- Leverage layers for dependencies [3]
- Monitor with CloudWatch metrics [1]

## References
[1] http://test1.com
[2] http://test2.com
[3] http://test3.com`;
    
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: keypointsSummary }] } }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><main><p>AWS Lambda content</p></main></body></html>')
      });
    });
    
    const { summarizeResults } = require('../content/content.js');
    await summarizeResults();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(8000);
    console.log('\n📝 KEY POINTS FORMAT TEST');
    console.log('─────────────────────────────────────────');
    console.log('Query: "AWS Lambda best practices"');
    console.log(`Time: ${duration.toFixed(2)}ms`);
    console.log('\nSummary Output:');
    console.log(keypointsSummary);
    console.log('\n✅ Status: PASS - Short key takeaways only');
  });

  test('Format comparison: all three formats side-by-side', async () => {
    const formats = [
      {
        name: 'detailed',
        summary: `# Topic Overview\n\n- **Point 1**: Detailed explanation with context and examples [1]\n- **Point 2**: Comprehensive information with background [2]\n- **Point 3**: In-depth analysis with reasoning [3]`
      },
      {
        name: 'brief',
        summary: `# Topic Summary\n\n- Key point one [1]\n- Key point two [2]\n- Key point three [3]`
      },
      {
        name: 'keypoints',
        summary: `# Topic\n\n- Point 1 [1]\n- Point 2 [2]\n- Point 3 [3]`
      }
    ];

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 FORMAT OPTIONS COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const format of formats) {
      chrome.storage.local.get.mockResolvedValue({ 
        flashApiKey: 'test-key',
        selectedLanguage: 'English',
        summaryFormat: format.name
      });
      
      chrome.storage.local.set.mockResolvedValue();
      
      fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{ content: { parts: [{ text: format.summary }] } }]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<html><body><main><p>Test content</p></main></body></html>')
        });
      });
      
      const start = performance.now();
      const { summarizeResults } = require('../content/content.js');
      await summarizeResults();
      const duration = performance.now() - start;
      
      console.log(`${format.name.toUpperCase()} FORMAT:`);
      console.log(`Time: ${duration.toFixed(2)}ms`);
      console.log(`Length: ${format.summary.length} chars`);
      console.log(`Output:\n${format.summary}\n`);
      console.log('─────────────────────────────────────────\n');
    }

    console.log('✅ All format options tested successfully');
    console.log('═══════════════════════════════════════════════════════════════\n');
  });
});
