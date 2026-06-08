#!/bin/bash
set -e

echo "Running tests with detailed output..."
npm test -- --verbose --no-coverage 2>&1 | tee test-output.log

echo ""
echo "Test Summary:"
grep -E "Test Suites:|Tests:" test-output.log || true

echo ""
echo "Failed Tests (if any):"
grep -E "FAIL|✕|Expected" test-output.log || echo "No failures found"
