/**
 * COMPLETE INTEGRATION EXAMPLE
 * This shows a working end-to-end integration with a PostgreSQL database
 * Adapt this to your specific backend structure
 */

// ============================================================================
// FILE 1: price-scraper/services/database.js
// ============================================================================

const { Pool } = require('pg');

// Initialize database connection (adjust to your setup)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Get all active tracked products that need price checking
 */
async function getTrackedProducts() {
  const query = `
    SELECT 
      p.id,
      p.product_url,
      p.product_name,
      p.current_price,
      p.target_price,
      p.user_id,
      u.email as user_email
    FROM tracked_products p
    JOIN users u ON p.user_id = u.id
    WHERE p.expires_at > NOW()
      AND p.is_active = true
    ORDER BY p.last_checked_at ASC NULLS FIRST
    LIMIT 100
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Update product price after scraping
 */
async function updateProductPrice(productId, newPrice) {
  const query = `
    UPDATE tracked_products 
    SET 
      current_price = $1,
      last_checked_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await pool.query(query, [newPrice, productId]);
  return result.rows[0];
}

/**
 * Log scrape result for monitoring
 */
async function logScrapeResult(result) {
  const query = `
    INSERT INTO scrape_logs (
      product_id,
      success,
      price_found,
      error_message,
      scraped_at
    ) VALUES ($1, $2, $3, $4, NOW())
  `;
  
  await pool.query(query, [
    result.productId,
    result.success,
    result.newPrice || null,
    result.error || null
  ]);
}

/**
 * Get products that need price drop notifications
 */
async function getPriceAlerts() {
  const query = `
    SELECT 
      p.id,
      p.product_name,
      p.product_url,
      p.current_price,
      p.target_price,
      p.user_id,
      u.email as user_email,
      u.notification_preferences
    FROM tracked_products p
    JOIN users u ON p.user_id = u.id
    WHERE p.current_price <= p.target_price
      AND p.notification_sent = false
      AND p.is_active = true
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Mark notification as sent
 */
async function markNotificationSent(productId) {
  const query = `
    UPDATE tracked_products 
    SET notification_sent = true 
    WHERE id = $1
  `;
  
  await pool.query(query, [productId]);
}

module.exports = {
  getTrackedProducts,
  updateProductPrice,
  logScrapeResult,
  getPriceAlerts,
  markNotificationSent
};

// ============================================================================
// FILE 2: price-scraper/services/notifications.js
// ============================================================================

const nodemailer = require('nodemailer');

// Configure email transporter (adjust to your email service)
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send price drop alert email
 */
async function sendPriceAlert(product) {
  const emailHtml = `
    <h2>🎉 Price Drop Alert!</h2>
    <p>The price for <strong>${product.product_name}</strong> has dropped to your target price!</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p><strong>Current Price:</strong> $${product.current_price}</p>
      <p><strong>Your Target:</strong> $${product.target_price}</p>
      <p><strong>You Save:</strong> $${(product.target_price - product.current_price).toFixed(2)}</p>
    </div>
    
    <a href="${product.product_url}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
      View Product
    </a>
    
    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      You're receiving this because you set up price tracking on DealPop.
    </p>
  `;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'DealPop <noreply@dealpop.com>',
    to: product.user_email,
    subject: `🎉 Price Drop: ${product.product_name}`,
    html: emailHtml
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notification sent to ${product.user_email}`);
  } catch (error) {
    console.error(`❌ Failed to send notification:`, error.message);
    throw error;
  }
}

/**
 * Send batch price alerts
 */
async function sendPriceAlerts(products) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const product of products) {
    try {
      await sendPriceAlert(product);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        productId: product.id,
        error: error.message
      });
    }
  }
  
  return results;
}

module.exports = {
  sendPriceAlert,
  sendPriceAlerts
};

// ============================================================================
// FILE 3: jobs/price-scraper-cron.js (Main cron job)
// ============================================================================

const cron = require('node-cron');
const { runPriceCheck } = require('../price-scraper/scraper');
const { 
  getTrackedProducts, 
  updateProductPrice, 
  logScrapeResult,
  getPriceAlerts,
  markNotificationSent
} = require('../price-scraper/services/database');
const { sendPriceAlerts } = require('../price-scraper/services/notifications');

/**
 * Main price checking function
 */
async function performPriceCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 STARTING SCHEDULED PRICE CHECK');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');
  
  try {
    // Step 1: Get products to check
    console.log('📦 Fetching tracked products from database...');
    const products = await getTrackedProducts();
    console.log(`✅ Found ${products.length} products to check\n`);
    
    if (products.length === 0) {
      console.log('ℹ️  No products to check. Exiting.');
      return;
    }
    
    // Step 2: Run scraper
    console.log('🤖 Starting Puppeteer scraper...');
    const results = await runPriceCheck(products);
    
    // Step 3: Process results
    console.log('\n📊 Processing results...');
    let successCount = 0;
    let failedCount = 0;
    let priceChanges = 0;
    
    for (const result of results) {
      try {
        // Log the scrape attempt
        await logScrapeResult(result);
        
        if (result.success) {
          // Update price in database
          await updateProductPrice(result.productId, result.newPrice);
          successCount++;
          
          if (result.newPrice !== result.oldPrice) {
            priceChanges++;
            console.log(`  💰 Price changed: ${result.productId} - $${result.oldPrice} → $${result.newPrice}`);
          }
        } else {
          failedCount++;
          console.error(`  ❌ Failed: ${result.productId} - ${result.error}`);
        }
      } catch (error) {
        console.error(`  ⚠️  Error processing result for ${result.productId}:`, error.message);
      }
    }
    
    // Step 4: Send notifications for price drops
    console.log('\n📧 Checking for price alerts...');
    const priceAlerts = await getPriceAlerts();
    
    if (priceAlerts.length > 0) {
      console.log(`🎉 Found ${priceAlerts.length} price drops! Sending notifications...`);
      const notificationResults = await sendPriceAlerts(priceAlerts);
      
      // Mark notifications as sent
      for (const product of priceAlerts) {
        if (notificationResults.success > 0) {
          await markNotificationSent(product.id);
        }
      }
      
      console.log(`✅ Sent ${notificationResults.success} notifications`);
      if (notificationResults.failed > 0) {
        console.log(`⚠️  Failed to send ${notificationResults.failed} notifications`);
      }
    } else {
      console.log('ℹ️  No price alerts to send');
    }
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ PRICE CHECK COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total products checked: ${products.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Price changes detected: ${priceChanges}`);
    console.log(`Notifications sent: ${priceAlerts.length}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ CRON JOB FAILED:', error);
    
    // TODO: Send alert to admin/monitoring service
    // await notifyAdmin({ error: error.message, timestamp: new Date() });
  }
}

/**
 * Schedule the cron job
 * Runs every 6 hours: at 00:00, 06:00, 12:00, 18:00
 */
function startPriceCheckCron() {
  console.log('⏰ Scheduling price check cron job...');
  console.log('📅 Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  
  // Schedule: '0 */6 * * *' means "at minute 0 of every 6th hour"
  cron.schedule('0 */6 * * *', async () => {
    await performPriceCheck();
  });
  
  console.log('✅ Cron job scheduled successfully\n');
  
  // Optional: Run immediately on startup
  if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('🔄 Running initial price check on startup...\n');
    performPriceCheck();
  }
}

// Start the cron job
startPriceCheckCron();

// Export for testing
module.exports = {
  performPriceCheck,
  startPriceCheckCron
};

// ============================================================================
// FILE 4: server.js or index.js (Add to your main file)
// ============================================================================

/*
// Add this to your main server file:

// Start the price scraper cron job
if (process.env.ENABLE_PRICE_SCRAPER === 'true') {
  require('./jobs/price-scraper-cron');
  console.log('✅ Price scraper cron job enabled');
}
*/

// ============================================================================
// FILE 5: .env (Add these environment variables)
// ============================================================================

/*
# Price Scraper Configuration
ENABLE_PRICE_SCRAPER=true
RUN_ON_STARTUP=false
PUPPETEER_HEADLESS=true
SCRAPER_TIMEOUT=30000

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=DealPop <noreply@dealpop.com>

# Database (adjust to your setup)
DATABASE_URL=postgresql://user:password@localhost:5432/dealpop
*/

// ============================================================================
// FILE 6: package.json (Add these dependencies)
// ============================================================================

/*
{
  "dependencies": {
    "puppeteer": "^21.6.1",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.7",
    "pg": "^8.11.3"  // Or your database driver
  },
  "scripts": {
    "scraper:test": "node price-scraper/scraper.js",
    "scraper:manual": "node jobs/price-scraper-cron.js"
  }
}
*/

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/*

1. INSTALLATION:
   npm install puppeteer node-cron nodemailer

2. SETUP DATABASE TABLES:
   - Make sure you have: tracked_products, users, scrape_logs tables
   - Add columns: last_checked_at, notification_sent to tracked_products
   - Create scrape_logs table if doesn't exist

3. CONFIGURE ENVIRONMENT:
   - Copy the .env variables above to your .env file
   - Update with your actual credentials

4. TEST SCRAPER:
   npm run scraper:test "https://www.amazon.com/dp/B0CX23V2ZK"

5. TEST FULL INTEGRATION:
   node jobs/price-scraper-cron.js

6. START YOUR SERVER:
   The cron job will start automatically if ENABLE_PRICE_SCRAPER=true

7. VERIFY IT'S WORKING:
   - Check console for "Cron job scheduled successfully"
   - Wait for next scheduled run or trigger manually
   - Check scrape_logs table for results

8. MONITOR:
   - Check console logs
   - Query scrape_logs table
   - Monitor email delivery

*/

