#!/bin/bash

# Build script for optimized Gist extension

echo "🚀 Building optimized Gist extension..."

# Create dist directory
rm -rf dist
mkdir -p dist/content dist/popup dist/icons dist/lib

# Copy core files
echo "📦 Copying core files..."
cp manifest.json dist/
cp background.js dist/

# Optimize assets first
echo "🎨 Optimizing assets..."
node scripts/optimize-assets.js
node scripts/minify-css.js

# Copy CSS files
echo "📦 Copying CSS files..."
cp content/content-critical.css dist/content/
cp content/content.min.css dist/content/
cp content/content.js dist/content/

# Copy popup files
echo "🖼️  Copying popup files..."
cp popup/popup.html dist/popup/
cp popup/popup.js dist/popup/

# Copy icons
echo "🎯 Copying icons..."
cp icons/* dist/icons/

# Copy libraries
echo "📚 Copying libraries..."
cp lib/showdown.min.js dist/lib/

# Calculate sizes
echo ""
echo "📊 Build Statistics:"
echo "-------------------"
ORIGINAL_CSS_SIZE=$(wc -c < content/content.css)
CRITICAL_CSS_SIZE=$(wc -c < content/content-critical.css)
MINIFIED_CSS_SIZE=$(wc -c < content/content.min.css)
SAVINGS=$((ORIGINAL_CSS_SIZE - MINIFIED_CSS_SIZE))
PERCENT=$((SAVINGS * 100 / ORIGINAL_CSS_SIZE))

echo "CSS Original:  $ORIGINAL_CSS_SIZE bytes"
echo "CSS Critical:  $CRITICAL_CSS_SIZE bytes (loaded immediately)"
echo "CSS Full:      $MINIFIED_CSS_SIZE bytes (lazy-loaded)"
echo "Reduction:     ${PERCENT}%"
echo ""

# Create zip for distribution
echo "📦 Creating distribution package..."
cd dist
zip -r ../gist-optimized.zip . > /dev/null 2>&1
cd ..

echo "✅ Build complete! Package: gist-optimized.zip"
echo ""
echo "Performance improvements:"
echo "  ✓ Lazy-loaded showdown.js (~50KB saved on initial load)"
echo "  ✓ Critical CSS inlined ($CRITICAL_CSS_SIZE bytes)"
echo "  ✓ Non-critical CSS lazy-loaded"
echo "  ✓ Minified CSS (${PERCENT}% reduction)"
echo "  ✓ DOM batching with DocumentFragment"
echo "  ✓ Memoized expensive functions"
echo "  ✓ Debounced event handlers"
echo "  ✓ requestIdleCallback for non-critical tasks"
