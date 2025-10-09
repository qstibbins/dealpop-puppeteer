/**
 * Price Scraping Cron Job
 * Runs periodically to check prices for all tracked products
 */

import { getTrackedProducts, updateProductPrice, getActiveAlerts, markAlertTriggered, logNotification } from '../price-scraper/services/database.js';
import { runPriceCheck } from '../price-scraper/scraper.js';
import { notifyUser } from '../utils/notifyUser.js';
import { notifySMS } from '../utils/notifySMS.js';

/**
 * Main cron job function
 */
async function runDailyScrape() {
  console.log('\n🕐 Starting scheduled price check...');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    // Get all active tracked products from database
    const products = await getTrackedProducts();
    console.log(`📦 Found ${products.length} products to check`);
    
    if (products.length === 0) {
      console.log('✅ No products to check. Exiting.');
      return;
    }
    
    // Run the scraper on all products
    const results = await runPriceCheck(products);
    
    // Process results: update database and send notifications
    for (const result of results) {
      if (result.success) {
        // Update product price in database
        await updateProductPrice(result.productId, result.newPrice);
        console.log(`✅ Updated price for product ${result.productId}: $${result.newPrice}`);
      } else {
        console.error(`❌ Failed to scrape product ${result.productId}: ${result.error}`);
      }
    }
    
    // Check for price alerts that should trigger notifications
    const alerts = await getActiveAlerts();
    console.log(`\n🔔 Found ${alerts.length} price alerts to process`);
    
    for (const alert of alerts) {
      try {
        const prefs = alert.notification_preferences || {};
        
        // Send email notification if enabled
        if (prefs.email !== false) {
          try {
            await notifyUser(
              alert.email,
              alert.product_name,
              alert.latest_price,
              alert.product_url
            );
            await logNotification(alert.user_id, alert.alert_id, 'email', 'sent');
            console.log(`📧 Sent email notification to ${alert.email}`);
          } catch (error) {
            await logNotification(alert.user_id, alert.alert_id, 'email', 'failed', error.message);
            console.error(`❌ Email notification failed: ${error.message}`);
          }
        }
        
        // Send SMS notification if enabled and phone verified
        if (prefs.sms && alert.phone_verified && alert.phone_number) {
          try {
            await notifySMS(
              alert.phone_number,
              alert.product_name,
              alert.latest_price,
              alert.product_url
            );
            await logNotification(alert.user_id, alert.alert_id, 'sms', 'sent');
            console.log(`📱 Sent SMS notification to ${alert.phone_number}`);
          } catch (error) {
            await logNotification(alert.user_id, alert.alert_id, 'sms', 'failed', error.message);
            console.error(`❌ SMS notification failed: ${error.message}`);
          }
        }
        
        // Mark alert as triggered
        await markAlertTriggered(alert.alert_id);
        
      } catch (error) {
        console.error(`❌ Error processing alert ${alert.alert_id}:`, error);
      }
    }
    
    console.log('\n✅ Scheduled price check completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Cron job failed:', error);
    throw error;
  }
}

// Run immediately
runDailyScrape()
  .then(() => {
    console.log('\n✅ Cron job finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cron job crashed:', error);
    process.exit(1);
  });
