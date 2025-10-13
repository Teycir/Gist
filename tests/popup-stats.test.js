/**
 * @jest-environment jsdom
 */

describe('Popup Stats Display', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    
    document.body.innerHTML = `
      <div id="todayCount">0</div>
      <div id="totalCount">0</div>
      <div id="cacheHitRate">0%</div>
      <div id="statsTitle">📊 Usage Stats</div>
      <div id="todayLabel">Today</div>
      <div id="totalLabel">Total</div>
      <div id="cacheLabel">Cache Hits</div>
    `;

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

  test('displays initial stats', async () => {
    await loadStats();
    
    expect(document.getElementById('todayCount').textContent).toBe('0');
    expect(document.getElementById('totalCount').textContent).toBe('0');
    expect(document.getElementById('cacheHitRate').textContent).toBe('0%');
  });

  test('displays stats with data', async () => {
    const today = new Date().toDateString();
    mockStorage.usageStats = {
      apiCalls: 10,
      cacheHits: 5,
      totalSummaries: 50,
      lastReset: today
    };
    
    await loadStats();
    
    expect(document.getElementById('todayCount').textContent).toBe('15');
    expect(document.getElementById('totalCount').textContent).toBe('50');
    expect(document.getElementById('cacheHitRate').textContent).toBe('33%');
  });

  test('shows 100% cache rate when all cached', async () => {
    const today = new Date().toDateString();
    mockStorage.usageStats = {
      apiCalls: 0,
      cacheHits: 20,
      totalSummaries: 100,
      lastReset: today
    };
    
    await loadStats();
    
    expect(document.getElementById('cacheHitRate').textContent).toBe('100%');
  });

  test('resets daily stats on new day', async () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    mockStorage.usageStats = {
      apiCalls: 100,
      cacheHits: 50,
      totalSummaries: 500,
      lastReset: yesterday
    };
    
    await loadStats();
    
    expect(mockStorage.usageStats.apiCalls).toBe(0);
    expect(mockStorage.usageStats.cacheHits).toBe(0);
    expect(mockStorage.usageStats.totalSummaries).toBe(500);
  });

  test('updates UI language for stats', () => {
    const translations = {
      English: { statsTitle: '📊 Usage Stats', todayLabel: 'Today', totalLabel: 'Total', cacheLabel: 'Cache Hits' },
      Spanish: { statsTitle: '📊 Estadísticas de Uso', todayLabel: 'Hoy', totalLabel: 'Total', cacheLabel: 'Caché' }
    };
    
    updateStatsLanguage('Spanish', translations);
    
    expect(document.getElementById('statsTitle').textContent).toBe('📊 Estadísticas de Uso');
    expect(document.getElementById('todayLabel').textContent).toBe('Hoy');
  });
});

async function loadStats() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['usageStats']);
  const stats = data.usageStats || { apiCalls: 0, cacheHits: 0, totalSummaries: 0, lastReset: today };
  
  if (stats.lastReset !== today) {
    stats.apiCalls = 0;
    stats.cacheHits = 0;
    stats.lastReset = today;
    await chrome.storage.local.set({ usageStats: stats });
  }
  
  const todayTotal = stats.apiCalls + stats.cacheHits;
  const cacheRate = todayTotal > 0 ? Math.round((stats.cacheHits / todayTotal) * 100) : 0;
  
  document.getElementById('todayCount').textContent = todayTotal;
  document.getElementById('totalCount').textContent = stats.totalSummaries;
  document.getElementById('cacheHitRate').textContent = `${cacheRate}%`;
}

function updateStatsLanguage(lang, translations) {
  const t = translations[lang];
  document.getElementById('statsTitle').textContent = t.statsTitle;
  document.getElementById('todayLabel').textContent = t.todayLabel;
  document.getElementById('totalLabel').textContent = t.totalLabel;
  document.getElementById('cacheLabel').textContent = t.cacheLabel;
}
