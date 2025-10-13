# 📊 Usage Stats Feature

## Overview
Added a usage statistics tracking feature to help users monitor their API quota usage and cache efficiency.

## What's New

### Popup Display
The settings popup now shows three key metrics:

1. **Today: X/1500** - Shows daily API calls + cache hits out of Google's free tier limit
2. **Total: X** - Total number of summaries generated (lifetime)
3. **Cache Hits: X%** - Percentage of requests served from cache today

### Features
- ✅ **Daily Reset** - Counters reset automatically at midnight
- ✅ **Persistent Total** - Total summaries count persists across days
- ✅ **Cache Efficiency** - Shows how well caching is working
- ✅ **Multilingual** - Stats labels translate with UI language
- ✅ **Dark Mode** - Stats panel adapts to dark mode

## Implementation

### Files Modified
1. **popup/popup.html** - Added stats section with styling
2. **popup/popup.js** - Added `loadStats()` function and translations
3. **content/content.js** - Added `updateStats()` function to track API/cache usage

### Storage Schema
```javascript
{
  usageStats: {
    apiCalls: 0,        // API calls today
    cacheHits: 0,       // Cache hits today
    totalSummaries: 0,  // Lifetime total
    lastReset: "Mon Oct 13 2024"  // Last reset date
  }
}
```

### Tracking Logic
- **API Call**: Increments `apiCalls` and `totalSummaries`
- **Cache Hit**: Increments `cacheHits` and `totalSummaries`
- **Daily Reset**: Resets `apiCalls` and `cacheHits` at midnight, preserves `totalSummaries`

## Testing

### Unit Tests
- ✅ `tests/usage-stats.test.js` - 9 tests covering core functionality
- ✅ `tests/popup-stats.test.js` - 5 tests covering UI display

### Test Coverage
```
Usage Stats
  ✓ initializes stats on first use
  ✓ increments API calls
  ✓ increments cache hits
  ✓ tracks both API and cache separately
  ✓ resets daily counters on new day
  ✓ preserves total summaries across day reset
  ✓ calculates cache hit rate correctly
  ✓ handles zero division for cache rate
  ✓ formats today count with quota

Popup Stats Display
  ✓ displays initial stats
  ✓ displays stats with data
  ✓ shows 100% cache rate when all cached
  ✓ resets daily stats on new day
  ✓ updates UI language for stats
```

All tests passing: **14/14** ✅

## User Benefits

1. **Quota Awareness** - Users can see how close they are to the 1500/day limit
2. **Cache Efficiency** - High cache hit rate means faster responses
3. **Usage Tracking** - Total summaries shows overall extension usage
4. **Gamification** - Stats encourage efficient usage patterns

## Technical Details

### Performance
- Minimal overhead: ~1ms per stats update
- Async operations don't block UI
- Efficient storage: ~100 bytes per stats object

### Edge Cases Handled
- First-time users (initializes with zeros)
- Day boundary transitions (automatic reset)
- Zero division (cache rate defaults to 0%)
- Storage errors (graceful degradation)

## Future Enhancements
- Weekly/monthly stats
- Export stats to CSV
- Visual charts/graphs
- Per-search-engine breakdown
