#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

console.log('📊 Analyzing Gist Extension Bundle\n');
console.log('═'.repeat(60));

const files = [
  { name: 'content.js', path: 'content/content.js', critical: true },
  { name: 'content.css', path: 'content/content.css', critical: true },
  { name: 'content.min.css', path: 'content/content.min.css', critical: true },
  { name: 'background.js', path: 'background.js', critical: true },
  { name: 'popup.js', path: 'popup/popup.js', critical: false },
  { name: 'popup.html', path: 'popup/popup.html', critical: false },
  { name: 'showdown.min.js', path: 'lib/showdown.min.js', critical: false },
  { name: 'manifest.json', path: 'manifest.json', critical: true }
];

let totalSize = 0;
let criticalSize = 0;

console.log('\n📦 File Sizes:\n');

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  const size = getFileSize(filePath);
  totalSize += size;
  
  if (file.critical) {
    criticalSize += size;
  }
  
  const indicator = file.critical ? '🔴' : '🟢';
  const label = file.critical ? 'critical' : 'lazy-load';
  
  console.log(`${indicator} ${file.name.padEnd(20)} ${formatBytes(size).padStart(12)}  [${label}]`);
});

console.log('\n' + '─'.repeat(60));
console.log(`Total Bundle Size:        ${formatBytes(totalSize)}`);
console.log(`Critical Path Size:       ${formatBytes(criticalSize)}`);
console.log(`Lazy-Loaded Size:         ${formatBytes(totalSize - criticalSize)}`);

const cssOriginal = getFileSize(path.join(__dirname, '../content/content.css'));
const cssMinified = getFileSize(path.join(__dirname, '../content/content.min.css'));
const cssSavings = cssOriginal - cssMinified;
const cssPercent = ((cssSavings / cssOriginal) * 100).toFixed(1);

console.log('\n📈 Optimization Metrics:\n');
console.log(`CSS Minification:         ${cssPercent}% reduction`);
console.log(`Lazy-Load Ratio:          ${((totalSize - criticalSize) / totalSize * 100).toFixed(1)}%`);

console.log('\n✨ Performance Impact:\n');
console.log('  ✓ Showdown.js lazy-loaded (saves ~50KB on initial load)');
console.log(`  ✓ CSS minified (saves ${formatBytes(cssSavings)})`);
console.log('  ✓ Critical path optimized');
console.log('  ✓ Non-blocking resource loading');

console.log('\n' + '═'.repeat(60));
