#!/bin/bash
# build-test.sh - Test build process locally

echo "=== BUILD TEST STARTING ==="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Files in directory:"
ls -la

echo "=== CLEANING NODE_MODULES ==="
rm -rf node_modules package-lock.json

echo "=== INSTALLING DEPENDENCIES ==="
npm install --production --verbose

echo "=== CHECKING PUPPETEER ==="
npm list puppeteer

echo "=== TESTING PUPPETEER ==="
node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({headless: true, args: ['--no-sandbox']})
  .then(browser => {
    console.log('✅ Puppeteer works locally');
    return browser.close();
  })
  .catch(err => {
    console.error('❌ Puppeteer failed:', err.message);
    process.exit(1);
  });
"

echo "=== BUILD TEST COMPLETE ==="
