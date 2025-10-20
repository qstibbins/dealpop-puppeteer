/**
 * App Runner server with cron scheduling
 */

import express from 'express';
import cron from 'node-cron';
import { pool } from './db.js';
import { runPriceCheck } from './price-scraper/scraper.js';
import { updateProductPrice, markAlertTriggered, logNotification } from './price-scraper/services/database.js';
import { notifyUser } from './utils/notifyUser.js';

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
  console.log('\n🕐 Starting scheduled price check...');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    // Get all active tracked products
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
    
    const products = productsResult.rows;
    console.log(`📦 Found ${products.length} products to check`);
    
    // Group products by user for better logging
    const productsByUser = products.reduce((acc, product) => {
      const userKey = `${product.email} (${product.user_id})`;
      if (!acc[userKey]) {
        acc[userKey] = [];
      }
      acc[userKey].push(product);
      return acc;
    }, {});
    
    console.log(`👥 Processing products for ${Object.keys(productsByUser).length} users:`);
    Object.entries(productsByUser).forEach(([user, userProducts]) => {
      console.log(`   📧 ${user}: ${userProducts.length} products`);
      userProducts.forEach(product => {
        console.log(`      • ${product.product_name} (${product.vendor}) - Current: $${product.current_price}, Target: $${product.target_price}`);
      });
    });
    console.log('');
    
    if (products.length === 0) {
      console.log('No products found to scrape');
      return;
    }
    
    // Run scraper
    const results = await runPriceCheck(products);
    
    // Process results: update database
    console.log('\n📝 Updating database...\n');
    for (const result of results) {
      if (result.success) {
        await updateProductPrice(result.productId, result.newPrice);
        console.log(`✅ Updated product ${result.productId}: $${result.newPrice}`);
      } else {
        console.error(`❌ Failed to scrape product ${result.productId}: ${result.error}`);
      }
    }
    
    // Check for price alerts
    console.log('\n🔔 Checking for price alerts...\n');
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
    console.log(`📊 Found ${alerts.length} active alerts to process`);
    
    if (alerts.length > 0) {
      console.log('🎯 Alert details:');
      alerts.forEach(alert => {
        console.log(`   📧 ${alert.email} (${alert.user_id})`);
        console.log(`      • Product: ${alert.product_name}`);
        console.log(`      • Price: $${alert.latest_price} (Target: $${alert.target_price})`);
        console.log(`      • Alert ID: ${alert.alert_id}`);
      });
      console.log('');
    }
    
    // Send email notifications
    for (const alert of alerts) {
      try {
        const prefs = alert.notification_preferences || {};
        
        // Send email notification
        if (prefs.email !== false) {
          console.log(`📧 Sending email to ${alert.email}...`);
          console.log(`   Product: ${alert.product_name}`);
          console.log(`   Price: $${alert.latest_price} (Target: $${alert.target_price})`);
          
          await notifyUser(alert.email, alert.product_name, alert.latest_price, alert.product_url);
          console.log(`   ✅ Email sent successfully!`);
          
          // Mark alert as triggered
          await markAlertTriggered(alert.alert_id);
          
          // Log notification
          await logNotification(alert.user_id, alert.alert_id, 'email', 'sent');
        }
        
      } catch (error) {
        console.error(`❌ Failed to send notification for alert ${alert.alert_id}:`, error.message);
        await logNotification(alert.user_id, alert.alert_id, 'email', 'failed', error.message);
      }
      console.log('');
    }
    
    console.log('✅ Scheduled scraper job completed successfully!');
    
  } catch (error) {
    console.error('❌ Scraper job failed:', error.message);
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

// Run scraper once on startup
console.log('🚀 Starting initial scraper run...');
runScraperJob().catch(error => {
  console.error('❌ Initial scraper run failed:', error);
});