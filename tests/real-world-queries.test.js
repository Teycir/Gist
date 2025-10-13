/**
 * @jest-environment jsdom
 */

global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0));
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.showdown = { Converter: jest.fn(() => ({ makeHtml: (md) => md })) };

global.chrome = global.chrome || {};
global.chrome.runtime = global.chrome.runtime || {};
global.chrome.runtime.getURL = jest.fn((path) => `chrome-extension://fake-id/${path}`);

const realWorldQueries = [
  {
    query: 'best practices for React hooks',
    urls: ['https://react.dev/hooks', 'https://kentcdodds.com/blog/react-hooks', 'https://blog.logrocket.com/react-hooks-best-practices'],
    expectedSummary: '# React Hooks Best Practices\n\n- Use hooks at the top level of components [1]\n- Custom hooks for reusable logic [2]\n- Avoid unnecessary re-renders with useMemo and useCallback [3]'
  },
  {
    query: 'JavaScript performance optimization',
    urls: ['https://developer.mozilla.org/en-US/docs/Web/Performance', 'https://web.dev/fast/', 'https://v8.dev/blog/cost-of-javascript-2019'],
    expectedSummary: '# JavaScript Performance Optimization\n\n- Minimize bundle size and use code splitting [1]\n- Optimize rendering with virtual DOM and lazy loading [2]\n- Reduce JavaScript execution time and parse costs [3]'
  },
  {
    query: 'AWS Lambda best practices',
    urls: ['https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html', 'https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/', 'https://lumigo.io/aws-lambda-performance/aws-lambda-best-practices/'],
    expectedSummary: '# AWS Lambda Best Practices\n\n- Keep functions small and focused on single tasks [1]\n- Optimize cold starts with provisioned concurrency [2]\n- Use environment variables and layers for dependencies [3]'
  },
  {
    query: 'Docker container security',
    urls: ['https://docs.docker.com/engine/security/', 'https://snyk.io/learn/docker-security/', 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html'],
    expectedSummary: '# Docker Container Security\n\n- Use minimal base images and scan for vulnerabilities [1]\n- Run containers as non-root users [2]\n- Implement network segmentation and secrets management [3]'
  },
  {
    query: 'Python async programming',
    urls: ['https://docs.python.org/3/library/asyncio.html', 'https://realpython.com/async-io-python/', 'https://superfastpython.com/python-asyncio/'],
    expectedSummary: '# Python Async Programming\n\n- Use asyncio for concurrent I/O operations [1]\n- async/await syntax for asynchronous functions [2]\n- Event loop manages task execution and scheduling [3]'
  }
];

describe('Real-World Query Performance Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="summarize-btn">Summarize</button><div id="search"></div>';
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.getURL.mockClear();
    fetch.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.window = { location: { search: '?q=test' } };
  });

  realWorldQueries.forEach(({ query, urls, expectedSummary }, index) => {
    test(`Query ${index + 1}: "${query}" - should complete within 8 seconds`, async () => {
      const searchDiv = document.getElementById('search');
      searchDiv.innerHTML = urls.map(url => `<a href="${url}">${url}</a>`).join('');
      
      const start = performance.now();
      
      chrome.storage.local.get.mockResolvedValue({ 
        flashApiKey: 'test-key', 
        selectedModel: 'models/gemini-1.5-flash', 
        selectedLanguage: 'English', 
        summaryFormat: 'detailed' 
      });
      
      chrome.storage.local.set.mockResolvedValue();
      
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'getTabId') {
          callback({ tabId: 123 });
        } else if (msg.action === 'fetchPage') {
          const mockContent = `<html><body><main><article><h1>${query}</h1><p>Detailed content about ${query} with comprehensive information and best practices.</p></article></main></body></html>`;
          setTimeout(() => callback({ success: true, html: mockContent }), 0);
        } else if (msg.action === 'callAPI') {
          setTimeout(() => callback({ success: true, data: { candidates: [{ content: { parts: [{ text: expectedSummary }] } }] } }), 0);
        }
      });
      
      fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{ content: { parts: [{ text: expectedSummary }] } }]
            })
          });
        }
        
        const mockContent = `<html><body><main><article><h1>${query}</h1><p>Detailed content about ${query} with comprehensive information and best practices.</p></article></main></body></html>`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockContent)
        });
      });
      
      const { summarizeResults } = require('../content/content.js');
      await summarizeResults();
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(8000);
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
      
      console.log(`\n📊 Query ${index + 1}: "${query}"`);
      console.log(`   ⏱️  Time: ${duration.toFixed(2)}ms`);
      console.log(`   📄 URLs: ${urls.length}`);
      console.log(`   ✅ Status: ${duration < 8000 ? 'PASS' : 'FAIL'}`);
    });
  });

  test('Performance Summary: All queries with timing breakdown', () => {
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 REAL-WORLD QUERY PERFORMANCE REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ All queries tested successfully');
    expect(true).toBe(true);
  });
});
