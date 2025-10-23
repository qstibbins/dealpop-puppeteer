/**
 * App Runner server with cron scheduling
 */

import express from 'express';
import cron from 'node-cron';
import { pool } from './db.js';
import { runPriceCheck } from './price-scraper/scraper.js';
import { updateProductPrice, markAlertTriggered, logNotification } from './price-scraper/services/database.js';
import { notifyUser } from './utils/notifyUser.js';
import { logDatabaseError, logNotificationError, createErrorSummary } from './utils/errorHandling.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'price-scraper'
  });
});

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    console.log('Manual scraper trigger received');
    await runScraperJob();
    res.json({ status: 'success', message: 'Scraper triggered manually' });
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main scraper function
async function runScraperJob() {
  const jobStartTime = Date.now();
  const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('\n🕐 STARTING SCHEDULED PRICE CHECK');
  console.log(`${'='.repeat(80)}`);
  console.log(`🆔 Job ID: ${jobId}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Get all active tracked products
    console.log('📊 Fetching active products from database...');
    const fetchStart = Date.now();
    const productsResult = await pool.query(`
      SELECT 
        tp.id, tp.user_id, tp.product_url, tp.product_name, 
        tp.vendor, tp.current_price, tp.target_price,
        u.email, u.display_name
      FROM tracked_products tp
      JOIN users u ON tp.user_id = u.firebase_uid
      WHERE tp.status = 'tracking'
        AND tp.expires_at > NOW()
      ORDER BY tp.updated_at ASC
      LIMIT 50
    `);
    const fetchTime = Date.now() - fetchStart;
    
    const products = productsResult.rows;
    console.log(`✅ Found ${products.length} products to check (${fetchTime}ms)`);
    
    // Enhanced user grouping with more details
    const productsByUser = products.reduce((acc, product) => {
      const userKey = `${product.display_name || 'Unknown'} (${product.email})`;
      if (!acc[userKey]) {
        acc[userKey] = {
          userId: product.user_id,
          email: product.email,
          displayName: product.display_name,
          products: []
        };
      }
      acc[userKey].products.push(product);
      return acc;
    }, {});
    
    console.log(`\n👥 PROCESSING PRODUCTS FOR ${Object.keys(productsByUser).length} USERS:`);
    console.log(`${'='.repeat(60)}`);
    Object.entries(productsByUser).forEach(([userKey, userData]) => {
      console.log(`📧 ${userData.displayName || 'Unknown'} (${userData.email})`);
      console.log(`   🆔 User ID: ${userData.userId}`);
      console.log(`   📦 Products: ${userData.products.length}`);
      userData.products.forEach((product, index) => {
        console.log(`      ${index + 1}. ${product.product_name} (${product.vendor})`);
        console.log(`         💰 Current: $${product.current_price}, 🎯 Target: $${product.target_price}`);
        console.log(`         🌐 URL: ${product.product_url}`);
      });
      console.log('');
    });
    
    if (products.length === 0) {
      console.log('ℹ️  No products found to scrape');
      return;
    }
    
    // Run scraper with timing
    console.log('🚀 Starting price extraction process...');
    const scraperStart = Date.now();
    const results = await runPriceCheck(products);
    const scraperTime = Date.now() - scraperStart;
    
    // Process results: update database
    console.log('\n📝 PROCESSING RESULTS & UPDATING DATABASE');
    console.log(`${'='.repeat(60)}`);
    const dbUpdateStart = Date.now();
    
    let updateSuccessCount = 0;
    let updateFailureCount = 0;
    
    for (const result of results) {
      if (result.success) {
        try {
          await updateProductPrice(result.productId, result.newPrice);
          console.log(`✅ Updated product ${result.productId}: $${result.newPrice} (${result.processingTime || 'N/A'}ms)`);
          updateSuccessCount++;
        } catch (updateError) {
          logDatabaseError(updateError, 'updateProductPrice', { 
            productId: result.productId, 
            newPrice: result.newPrice 
          });
          updateFailureCount++;
        }
      } else {
        console.error(`❌ Failed to scrape product ${result.productId}: ${result.error}`);
        updateFailureCount++;
      }
    }
    const dbUpdateTime = Date.now() - dbUpdateStart;
    console.log(`⏱️  Database updates completed in ${dbUpdateTime}ms`);
    console.log(`   ✅ Successful updates: ${updateSuccessCount}`);
    console.log(`   ❌ Failed updates: ${updateFailureCount}`);
    
    // Enhanced alert processing
    console.log('\n🔔 CHECKING FOR PRICE ALERTS');
    console.log(`${'='.repeat(60)}`);
    const alertCheckStart = Date.now();
    
    const alertsResult = await pool.query(`
      SELECT 
        a.id as alert_id,
        a.product_id,
        a.user_id,
        a.product_name,
        a.product_url,
        a.current_price,
        a.target_price,
        a.notification_preferences,
        tp.current_price as latest_price,
        u.email,
        u.display_name
      FROM alerts a
      JOIN tracked_products tp ON a.product_id = tp.id
      JOIN users u ON a.user_id = u.firebase_uid
      WHERE a.status = 'active'
        AND a.alert_type = 'price_drop'
        AND tp.current_price <= a.target_price
        AND a.expires_at > NOW()
    `);
    
    const alerts = alertsResult.rows;
    const alertCheckTime = Date.now() - alertCheckStart;
    console.log(`📊 Found ${alerts.length} active alerts to process (${alertCheckTime}ms)`);
    
    if (alerts.length > 0) {
      console.log('🎯 ALERT DETAILS:');
      alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. 📧 ${alert.display_name || 'Unknown'} (${alert.email})`);
        console.log(`      📦 Product: ${alert.product_name}`);
        console.log(`      💰 Price: $${alert.latest_price} (Target: $${alert.target_price})`);
        console.log(`      🆔 Alert ID: ${alert.alert_id}`);
        console.log(`      🌐 URL: ${alert.product_url}`);
        console.log('');
      });
    }
    
    // Send email notifications with enhanced logging
    const notificationStart = Date.now();
    let notificationSuccessCount = 0;
    let notificationFailureCount = 0;
    
    for (const alert of alerts) {
      try {
        const prefs = alert.notification_preferences || {};
        
        // Send email notification
        if (prefs.email !== false) {
          console.log(`📧 Sending email notification...`);
          console.log(`   👤 To: ${alert.display_name || 'Unknown'} (${alert.email})`);
          console.log(`   📦 Product: ${alert.product_name}`);
          console.log(`   💰 Price: $${alert.latest_price} (Target: $${alert.target_price})`);
          console.log(`   🌐 URL: ${alert.product_url}`);
          
          const emailStart = Date.now();
          await notifyUser(alert.email, alert.product_name, alert.latest_price, alert.product_url);
          const emailTime = Date.now() - emailStart;
          
          console.log(`   ✅ Email sent successfully! (${emailTime}ms)`);
          
          // Mark alert as triggered
          await markAlertTriggered(alert.alert_id);
          
          // Log notification
          await logNotification(alert.user_id, alert.alert_id, 'email', 'sent');
          notificationSuccessCount++;
        }
        
      } catch (error) {
        logNotificationError(error, alert, 'email');
        await logNotification(alert.user_id, alert.alert_id, 'email', 'failed', error.message);
        notificationFailureCount++;
      }
      console.log('');
    }
    const notificationTime = Date.now() - notificationStart;
    
    // Final summary
    const totalJobTime = Date.now() - jobStartTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 JOB COMPLETION SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`🆔 Job ID: ${jobId}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log(`⏱️  Total Job Time: ${totalJobTime}ms (${(totalJobTime/1000).toFixed(2)}s)`);
    console.log(`📦 Products Processed: ${products.length}`);
    console.log(`✅ Successful Scrapes: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed Scrapes: ${results.filter(r => !r.success).length}`);
    console.log(`🎉 Price Alerts Triggered: ${results.filter(r => r.priceDropped).length}`);
    console.log(`📧 Notifications Sent: ${notificationSuccessCount}`);
    console.log(`❌ Notification Failures: ${notificationFailureCount}`);
    console.log(`📈 Success Rate: ${((results.filter(r => r.success).length / products.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Performance Breakdown:`);
    console.log(`   • Database fetch: ${fetchTime}ms`);
    console.log(`   • Price extraction: ${scraperTime}ms`);
    console.log(`   • Database updates: ${dbUpdateTime}ms`);
    console.log(`   • Alert processing: ${alertCheckTime}ms`);
    console.log(`   • Notifications: ${notificationTime}ms`);
    console.log(`⏱️  Average Time per Product: ${(totalJobTime / products.length).toFixed(0)}ms`);
    
    // Show failed products for debugging
    const failedProducts = results.filter(r => !r.success);
    if (failedProducts.length > 0) {
      console.log(`\n❌ FAILED PRODUCTS SUMMARY:`);
      failedProducts.forEach((result, index) => {
        console.log(`   ${index + 1}. Product ID: ${result.productId}`);
        console.log(`      Error: ${result.error}`);
        console.log(`      Error Type: ${result.errorType || 'Unknown'}`);
        console.log(`      URL: ${result.url}`);
        console.log(`      User: ${result.userEmail}`);
        console.log(`      Error ID: ${result.errorId || 'N/A'}`);
      });
      
      // Create error summary
      const errorSummary = createErrorSummary(failedProducts);
      console.log(`\n📊 ERROR SUMMARY:`);
      console.log(`   Total Errors: ${errorSummary.totalErrors}`);
      console.log(`   Error Types: ${JSON.stringify(errorSummary.errorTypes)}`);
      console.log(`   Time Range: ${errorSummary.timeRange.first} to ${errorSummary.timeRange.last}`);
    }
    
    console.log(`${'='.repeat(80)}\n`);
    console.log('✅ Scheduled scraper job completed successfully!');
    
  } catch (error) {
    const totalJobTime = Date.now() - jobStartTime;
    console.error('❌ Scraper job failed:', error.message);
    console.error(`🆔 Job ID: ${jobId}`);
    console.error(`⏱️  Failed after: ${totalJobTime}ms`);
    console.error('Stack trace:', error.stack);
  }
}

// Schedule scraper to run every 10 minutes
cron.schedule('*/10 * * * *', () => {
  console.log('⏰ Cron trigger: Starting scheduled scraper job');
  runScraperJob().catch(error => {
    console.error('❌ Scheduled job failed:', error);
  });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Price scraper server running on port ${PORT}`); // Updated for App Runner deployment
  console.log(`📅 Scheduled to run every 10 minutes`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Manual trigger: POST http://localhost:${PORT}/trigger`);
  
  // Debug information
  console.log(`🔍 DEBUG INFO:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   PORT: ${process.env.PORT}`);
  console.log(`   DB_HOST: ${process.env.DB_HOST ? 'SET' : 'NOT SET'}`);
  console.log(`   SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Working directory: ${process.cwd()}`);
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Test Playwright on startup
console.log('🔍 Testing Playwright availability...');
try {
  const { chromium } = await import('playwright');
  console.log('✅ Playwright imported successfully');

  // Try to launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('✅ Playwright browser launched successfully');
  await browser.close();
  console.log('✅ Playwright test completed successfully');
} catch (error) {
  console.error('❌ PLAYWRIGHT TEST FAILED:', error);
  console.error('Error details:', error.message);
  console.error('Stack:', error.stack);
}

// Run scraper once on startup (asynchronously after server starts)
setTimeout(() => {
  console.log('🚀 Starting initial scraper run...');
  runScraperJob().catch(error => {
    console.error('❌ Initial scraper run failed:', error);
  });
}, 5000); // Wait 5 seconds for server to fully start