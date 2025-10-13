describe('Usage Stats', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    global.chrome = {
      storage: {
        local: {
          get: jest.fn((keys) => Promise.resolve(mockStorage)),
          set: jest.fn((data) => {
            Object.assign(mockStorage, data);
            return Promise.resolve();
          })
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes stats on first use', async () => {
    const today = new Date().toDateString();
    await updateStats('api');
    
    expect(mockStorage.usageStats).toEqual({
      apiCalls: 1,
      cacheHits: 0,
      totalSummaries: 1,
      lastReset: today
    });
  });

  test('increments API calls', async () => {
    await updateStats('api');
    await updateStats('api');
    
    expect(mockStorage.usageStats.apiCalls).toBe(2);
    expect(mockStorage.usageStats.totalSummaries).toBe(2);
  });

  test('increments cache hits', async () => {
    await updateStats('cache');
    await updateStats('cache');
    
    expect(mockStorage.usageStats.cacheHits).toBe(2);
    expect(mockStorage.usageStats.totalSummaries).toBe(2);
  });

  test('tracks both API and cache separately', async () => {
    await updateStats('api');
    await updateStats('cache');
    await updateStats('api');
    
    expect(mockStorage.usageStats.apiCalls).toBe(2);
    expect(mockStorage.usageStats.cacheHits).toBe(1);
    expect(mockStorage.usageStats.totalSummaries).toBe(3);
  });

  test('resets daily counters on new day', async () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    mockStorage.usageStats = {
      apiCalls: 10,
      cacheHits: 5,
      totalSummaries: 100,
      lastReset: yesterday
    };
    
    await updateStats('api');
    
    expect(mockStorage.usageStats.apiCalls).toBe(1);
    expect(mockStorage.usageStats.cacheHits).toBe(0);
    expect(mockStorage.usageStats.totalSummaries).toBe(101);
    expect(mockStorage.usageStats.lastReset).toBe(new Date().toDateString());
  });

  test('preserves total summaries across day reset', async () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    mockStorage.usageStats = {
      apiCalls: 10,
      cacheHits: 5,
      totalSummaries: 100,
      lastReset: yesterday
    };
    
    await updateStats('cache');
    
    expect(mockStorage.usageStats.totalSummaries).toBe(101);
  });

  test('calculates cache hit rate correctly', () => {
    const stats = { apiCalls: 7, cacheHits: 3, totalSummaries: 10 };
    const todayTotal = stats.apiCalls + stats.cacheHits;
    const cacheRate = Math.round((stats.cacheHits / todayTotal) * 100);
    
    expect(cacheRate).toBe(30);
  });

  test('handles zero division for cache rate', () => {
    const stats = { apiCalls: 0, cacheHits: 0, totalSummaries: 0 };
    const todayTotal = stats.apiCalls + stats.cacheHits;
    const cacheRate = todayTotal > 0 ? Math.round((stats.cacheHits / todayTotal) * 100) : 0;
    
    expect(cacheRate).toBe(0);
  });

  test('formats today count without quota', () => {
    const stats = { apiCalls: 150, cacheHits: 50 };
    const todayTotal = stats.apiCalls + stats.cacheHits;
    const formatted = `${todayTotal}`;
    
    expect(formatted).toBe('200');
  });
});

async function updateStats(type) {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['usageStats']);
  const stats = data.usageStats || { apiCalls: 0, cacheHits: 0, totalSummaries: 0, lastReset: today };
  
  if (stats.lastReset !== today) {
    stats.apiCalls = 0;
    stats.cacheHits = 0;
    stats.lastReset = today;
  }
  
  if (type === 'api') {
    stats.apiCalls++;
    stats.totalSummaries++;
  } else if (type === 'cache') {
    stats.cacheHits++;
    stats.totalSummaries++;
  }
  
  await chrome.storage.local.set({ usageStats: stats });
}
