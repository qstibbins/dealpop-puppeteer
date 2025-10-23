# DealPop Price Checker Service - Developer Setup Guide

## Overview

This guide will get you up and running with the DealPop Price Checker Service for local development. The setup process takes approximately 5-10 minutes and includes all necessary dependencies and configuration.

## Table of Contents

- [Quick Setup (5 minutes)](#quick-setup-5-minutes)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

## Quick Setup (5 minutes)

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+**: [Download from nodejs.org](https://nodejs.org/)
- **PostgreSQL**: [Download from postgresql.org](https://www.postgresql.org/download/)
- **Git**: [Download from git-scm.com](https://git-scm.com/)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd puppeteer-scraper

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealpop_dev
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false

# Notification Services (for testing)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=test@example.com

# Application Configuration
NODE_ENV=development
PORT=3000
```

### Step 3: Database Setup

#### Option A: Connect to Existing Database
If you have access to the production/staging database:
```bash
# Update .env with existing database credentials
DB_HOST=your-existing-db-host
DB_PORT=5432
DB_NAME=dealpop
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true
```

#### Option B: Local PostgreSQL Database
```bash
# Create local database
createdb dealpop_dev

# Run database setup (if needed)
npm run setup-db
```

### Step 4: Run the Service

```bash
# Start development server
npm run dev

# The service will start on http://localhost:3000
```

### Step 5: Verify Setup

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "service": "price-scraper"
# }

# Test manual trigger (optional)
curl -X POST http://localhost:3000/trigger
```

## Development Workflow

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# With debug logging
DEBUG=* npm run dev
```

### Testing the Scraper

#### Test Single Product
```bash
# Test with a specific product URL
node price-scraper/scraper.js "https://www.amazon.com/dp/B0CX23V2ZK"

# Or use the test script
npm run test:scraper "https://www.amazon.com/dp/B0CX23V2ZK"
```

#### Test Multiple Products
```bash
# Run the full scraper test suite
npm run test:scraper:all
```

### Manual API Testing

```bash
# Health check
curl http://localhost:3000/health

# Manual trigger
curl -X POST http://localhost:3000/trigger

# With verbose output
curl -v -X POST http://localhost:3000/trigger
```

### Viewing Logs

The development server provides detailed console output:

```bash
# Real-time logs
npm run dev

# Logs include:
# - Server startup information
# - Playwright browser testing
# - Database connection status
# - Cron job execution
# - Price extraction results
# - Notification delivery status
```

### Database Queries for Debugging

```bash
# Connect to database
psql -h localhost -U your_username -d dealpop_dev

# Useful queries:
# View tracked products
SELECT id, product_name, current_price, target_price, status FROM tracked_products LIMIT 10;

# View recent price history
SELECT * FROM price_history ORDER BY recorded_at DESC LIMIT 10;

# View active alerts
SELECT * FROM alerts WHERE status = 'active' LIMIT 10;

# View notification logs
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;
```

## Testing

### How to Test Price Extraction

#### 1. Test with Sample Products
```bash
# Create test products in database
INSERT INTO tracked_products (user_id, product_url, product_name, vendor, current_price, target_price, status, expires_at)
VALUES 
  ('test-user-123', 'https://www.amazon.com/dp/B0CX23V2ZK', 'Test Product 1', 'Amazon', 100.00, 90.00, 'tracking', NOW() + INTERVAL '30 days'),
  ('test-user-123', 'https://www.target.com/p/test-product', 'Test Product 2', 'Target', 50.00, 45.00, 'tracking', NOW() + INTERVAL '30 days');
```

#### 2. Run Manual Price Check
```bash
# Trigger price check
curl -X POST http://localhost:3000/trigger

# Check results in database
SELECT * FROM price_history WHERE product_id IN (1, 2) ORDER BY recorded_at DESC;
```

#### 3. Test Price Extraction Directly
```bash
# Test specific extraction methods
node -e "
import { extractPrice } from './price-scraper/extractors/price-extractor.js';
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com/dp/B0CX23V2ZK');
  const price = await extractPrice(page);
  console.log('Extracted price:', price);
  await browser.close();
})();
"
```

### How to Test Notifications

#### 1. Set Up Test Alert
```bash
# Create test alert
INSERT INTO alerts (user_id, product_id, product_name, product_url, current_price, target_price, alert_type, status, expires_at)
VALUES ('test-user-123', 1, 'Test Product', 'https://example.com', 100.00, 90.00, 'price_drop', 'active', NOW() + INTERVAL '30 days');
```

#### 2. Test Email Notifications
```bash
# Test SendGrid integration
node -e "
import { notifyUser } from './utils/notifyUser.js';
await notifyUser('test@example.com', 'Test Product', 85.00, 'https://example.com');
console.log('Email sent successfully');
"
```

#### 3. Test SMS Notifications (Optional)
```bash
# Test Twilio integration
node -e "
import { notifySMS } from './utils/notifySMS.js';
await notifySMS('+1234567890', 'Test Product', 85.00, 'https://example.com');
console.log('SMS sent successfully');
"
```

### How to Test Database Operations

#### 1. Test Database Connection
```bash
# Test connection
node -e "
import { pool } from './db.js';
const result = await pool.query('SELECT NOW()');
console.log('Database connected:', result.rows[0]);
await pool.end();
"
```

#### 2. Test Database Operations
```bash
# Test price update
node -e "
import { updateProductPrice } from './price-scraper/services/database.js';
await updateProductPrice(1, 95.00);
console.log('Price updated successfully');
"
```

## Common Development Tasks

### Adding Support for New Retailers

#### 1. Add Retailer-Specific Selectors
```javascript
// In price-scraper/config/selectors.js
export const RETAILER_SELECTORS = {
  amazon: [
    '.a-price-whole',
    '.a-price .a-offscreen',
    // ... existing selectors
  ],
  newRetailer: [
    '.price-current',
    '.product-price',
    '.price-value',
    // Add retailer-specific selectors
  ]
};
```

#### 2. Test New Selectors
```bash
# Test with new retailer URL
node price-scraper/scraper.js "https://newretailer.com/product/123"
```

#### 3. Update Documentation
Update the README.md to include the new retailer in the supported sites list.

### Debugging Price Extraction Failures

#### 1. Enable Debug Mode
```bash
# Run with debug logging
DEBUG=playwright:* npm run dev
```

#### 2. Take Screenshots
```javascript
// Add to price-scraper/scraper.js
await page.screenshot({ path: 'debug-screenshot.png' });
```

#### 3. Inspect Page Content
```javascript
// Add to price-extractor.js
const pageContent = await page.content();
console.log('Page content length:', pageContent.length);

// Check for specific elements
const priceElements = await page.$$('[class*="price"]');
console.log('Found price elements:', priceElements.length);
```

### Testing Notification Templates

#### 1. Update Email Template
```javascript
// In utils/notifyUser.js
const msg = {
  // ... existing config
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>🎉 Price Drop Alert!</h2>
      <p><strong>${productTitle}</strong> is now <span style="color: #e74c3c;">$${newPrice}</span></p>
      <!-- Your custom template -->
    </div>
  `
};
```

#### 2. Test Template
```bash
# Send test email
node -e "
import { notifyUser } from './utils/notifyUser.js';
await notifyUser('your-email@example.com', 'Test Product', 85.00, 'https://example.com');
"
```

### Database Migrations (if needed)

#### 1. Create Migration
```sql
-- Create new migration file: migrations/add_new_column.sql
ALTER TABLE tracked_products ADD COLUMN new_field VARCHAR(255);
```

#### 2. Apply Migration
```bash
# Run migration
psql -h localhost -U your_username -d dealpop_dev -f migrations/add_new_column.sql
```

## Troubleshooting

### Playwright/Chrome Issues

#### Problem: "Playwright test failed"
```bash
# Solution: Reinstall Playwright
npx playwright install chromium
npx playwright install-deps
```

#### Problem: "Browser not found"
```bash
# Solution: Check Playwright installation
npx playwright --version
npx playwright install chromium
```

#### Problem: "Chrome crashed"
```bash
# Solution: Increase memory allocation
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### Database Connection Errors

#### Problem: "Database connection failed"
```bash
# Check database is running
pg_isready -h localhost -p 5432

# Check credentials
psql -h localhost -U your_username -d dealpop_dev -c "SELECT 1;"

# Check environment variables
echo $DB_HOST $DB_PORT $DB_NAME
```

#### Problem: "SSL connection required"
```bash
# Update .env file
DB_SSL=true

# Or disable SSL for local development
DB_SSL=false
```

### Environment Variable Problems

#### Problem: "Environment variable not set"
```bash
# Check .env file exists
ls -la .env

# Check .env file contents
cat .env

# Verify variables are loaded
node -e "console.log(process.env.DB_HOST)"
```

#### Problem: "SendGrid API key invalid"
```bash
# Test SendGrid API key
curl -X "GET" "https://api.sendgrid.com/v3/user/account" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Common Scraping Failures

#### Problem: "Could not extract price from page"
```bash
# Debug steps:
# 1. Check if page loads
curl -I "https://example.com/product"

# 2. Test with different user agent
# 3. Check for anti-bot measures
# 4. Try different extraction strategies
```

#### Problem: "Page timeout"
```bash
# Increase timeout in scraper.js
await page.goto(product.product_url, {
  waitUntil: 'domcontentloaded',
  timeout: 30000  // Increase from 15000
});
```

### Performance Issues

#### Problem: "Memory usage too high"
```bash
# Monitor memory usage
node --inspect npm run dev

# Or use process monitor
htop  # Linux/Mac
```

#### Problem: "Slow price extraction"
```bash
# Profile the application
node --prof npm run dev

# Check network latency
ping amazon.com
```

### Getting Help

1. **Check Logs**: Always start with the console output
2. **Review Documentation**: [Architecture Guide](./ARCHITECTURE.md)
3. **Common Issues**: [Gotchas Guide](./GOTCHAS.md)
4. **Database Issues**: Check PostgreSQL logs
5. **Playwright Issues**: [Playwright Documentation](https://playwright.dev/)

### Useful Development Commands

```bash
# Quick health check
curl http://localhost:3000/health

# Test database connection
npm run test:db

# Run all tests
npm test

# Check code quality
npm run lint

# Format code
npm run format

# Clean install
rm -rf node_modules package-lock.json && npm install

# Reset database (careful!)
npm run reset:db
```

---

**Last Updated**: January 2024  
**Developer Setup Version**: 1.0.0
