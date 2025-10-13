#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Optimizing assets...\n');

// Optimize SVG icons
const iconsDir = path.join(__dirname, '../icons');
const svgPath = path.join(iconsDir, 'icon.svg');

if (fs.existsSync(svgPath)) {
  let svg = fs.readFileSync(svgPath, 'utf8');
  const originalSize = Buffer.byteLength(svg, 'utf8');
  
  // Basic SVG optimization
  svg = svg
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  
  fs.writeFileSync(svgPath, svg, 'utf8');
  const optimizedSize = Buffer.byteLength(svg, 'utf8');
  const savings = originalSize - optimizedSize;
  
  console.log(`✓ SVG optimized: ${originalSize} → ${optimizedSize} bytes (${savings} saved)`);
}

// Split CSS into critical and non-critical
const cssPath = path.join(__dirname, '../content/content.css');
const criticalPath = path.join(__dirname, '../content/content-critical.css');

const criticalSelectors = [
  '.summarize-btn',
  '.loading-spinner',
  '@keyframes spin'
];

if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  
  // Extract critical CSS
  let critical = '';
  criticalSelectors.forEach(selector => {
    const regex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*}`, 'g');
    const matches = css.match(regex);
    if (matches) critical += matches.join('\n');
  });
  
  // Minify critical CSS
  critical = critical
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
  
  fs.writeFileSync(criticalPath, critical, 'utf8');
  console.log(`✓ Critical CSS extracted: ${Buffer.byteLength(critical, 'utf8')} bytes`);
}

console.log('\n✅ Asset optimization complete!');
