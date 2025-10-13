#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s*!important/g, '!important')
    .trim();
}

const inputFile = path.join(__dirname, '../content/content.css');
const outputFile = path.join(__dirname, '../content/content.min.css');

console.log('🎨 Minifying CSS...');

const css = fs.readFileSync(inputFile, 'utf8');
const minified = minifyCSS(css);

fs.writeFileSync(outputFile, minified, 'utf8');

const originalSize = Buffer.byteLength(css, 'utf8');
const minifiedSize = Buffer.byteLength(minified, 'utf8');
const savings = originalSize - minifiedSize;
const percent = ((savings / originalSize) * 100).toFixed(1);

console.log(`✅ CSS minified successfully!`);
console.log(`   Original:  ${originalSize.toLocaleString()} bytes`);
console.log(`   Minified:  ${minifiedSize.toLocaleString()} bytes`);
console.log(`   Savings:   ${savings.toLocaleString()} bytes (${percent}%)`);
