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
    // Get products for stibbins99@gmail.com
    const productsResult = await pool.query(`
      SELECT 
        id, user_id, product_url, product_name, 
        vendor, current_price, target_price
      FROM tracked_products 
      WHERE user_id = 'b5e7wHFfyZg2On72tL0mAMScGmO2'
      ORDER BY id DESC
      LIMIT 10
    `);
    
    const products = productsResult.rows;
    console.log(`📦 Found ${products.length} products to check\n`);
    
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
        u.email
      FROM alerts a
      JOIN tracked_products tp ON a.product_id = tp.id
      JOIN users u ON a.user_id = u.firebase_uid
      WHERE a.user_id = 'b5e7wHFfyZg2On72tL0mAMScGmO2'
        AND a.status = 'active'
        AND a.alert_type = 'price_drop'
        AND tp.current_price <= a.target_price
    `);
    
    const alerts = alertsResult.rows;
    console.log(`📊 Found ${alerts.length} active alerts to process\n`);
    
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

// Schedule scraper to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ Cron trigger: Starting scheduled scraper job');
  runScraperJob().catch(error => {
    console.error('❌ Scheduled job failed:', error);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Price scraper server running on port ${PORT}`);
  console.log(`📅 Scheduled to run every 5 minutes`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Manual trigger: POST http://localhost:${PORT}/trigger`);
});

// Run scraper once on startup
console.log('🚀 Starting initial scraper run...');
runScraperJob().catch(error => {
  console.error('❌ Initial scraper run failed:', error);
});