/**
 * Database Service for Price Scraper
 * Provides database operations for tracked products and price updates
 */

import { pool, db } from '../../db.js';

/**
 * Get all active tracked products
 * @returns {Promise<Array>} - Array of tracked products
 */
export async function getTrackedProducts() {
  const query = `
    SELECT 
      tp.id,
      tp.user_id,
      tp.product_url,
      tp.product_name,
      tp.product_image_url,
      tp.vendor,
      tp.current_price,
      tp.target_price,
      tp.status,
      tp.expires_at,
      tp.created_at
    FROM tracked_products tp
    WHERE tp.status = 'tracking'
      AND tp.expires_at > NOW()
    ORDER BY tp.updated_at ASC
    LIMIT 100
  `;
  
  return await db.any(query);
}

/**
 * Update product price in database
 * @param {number} productId - Product ID
 * @param {number} newPrice - New price
 * @returns {Promise<void>}
 */
export async function updateProductPrice(productId, newPrice) {
  await db.none(
    `UPDATE tracked_products 
     SET current_price = $1, updated_at = NOW() 
     WHERE id = $2`,
    [newPrice, productId]
  );
  
  // Also record in price history
  await db.none(
    `INSERT INTO price_history (product_id, price, in_stock, recorded_at)
     VALUES ($1, $2, true, NOW())`,
    [productId, newPrice]
  );
}

/**
 * Get product details for notification
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} - Product with user email
 */
export async function getProductForNotification(productId) {
  return await db.one(
    `SELECT 
      tp.id,
      tp.user_id,
      tp.product_url,
      tp.product_name,
      tp.product_image_url,
      tp.current_price,
      tp.target_price,
      u.email,
      u.display_name
    FROM tracked_products tp
    JOIN users u ON tp.user_id = u.firebase_uid
    WHERE tp.id = $1`,
    [productId]
  );
}

/**
 * Log scraping results
 * @param {number} productId - Product ID
 * @param {boolean} success - Whether scrape was successful
 * @param {string|null} error - Error message if failed
 * @returns {Promise<void>}
 */
export async function logScrapeResult(productId, success, error = null) {
  // You can implement a scrape_logs table if you want detailed logging
  // For now, we just log to console
  if (success) {
    console.log(`✅ Logged successful scrape for product ${productId}`);
  } else {
    console.error(`❌ Logged failed scrape for product ${productId}: ${error}`);
  }
}

/**
 * Get active alerts that should trigger notifications
 * @returns {Promise<Array>} - Array of alerts to process
 */
export async function getActiveAlerts() {
  const query = `
    SELECT 
      a.id as alert_id,
      a.product_id,
      a.user_id,
      a.current_price,
      a.target_price,
      a.notification_preferences,
      tp.product_name,
      tp.product_url,
      tp.current_price as latest_price,
      u.email,
      uap.phone_number,
      uap.phone_verified
    FROM alerts a
    JOIN tracked_products tp ON a.product_id = tp.id
    JOIN users u ON a.user_id = u.firebase_uid
    LEFT JOIN user_alert_preferences uap ON a.user_id = uap.user_id
    WHERE a.status = 'active'
      AND a.alert_type = 'price_drop'
      AND tp.current_price <= a.target_price
      AND a.expires_at > NOW()
  `;
  
  return await db.any(query);
}

/**
 * Mark alert as triggered
 * @param {number} alertId - Alert ID
 * @returns {Promise<void>}
 */
export async function markAlertTriggered(alertId) {
  await db.none(
    `UPDATE alerts 
     SET status = 'triggered', triggered_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [alertId]
  );
  
  // Log to alert history
  await db.none(
    `INSERT INTO alert_history (alert_id, event_type, message, timestamp)
     VALUES ($1, 'triggered', 'Price alert triggered', NOW())`,
    [alertId]
  );
}

/**
 * Create a notification log entry
 * @param {number} userId - User ID
 * @param {number} alertId - Alert ID
 * @param {string} channel - Notification channel (email, sms, push)
 * @param {string} status - Status (sent, failed, pending)
 * @param {string|null} error - Error message if failed
 * @returns {Promise<void>}
 */
export async function logNotification(userId, alertId, channel, status, error = null) {
  await db.none(
    `INSERT INTO notification_logs 
      (user_id, alert_id, notification_type, channel, status, sent_at, error_message, created_at)
     VALUES ($1, $2, 'price_drop_alert', $3, $4, NOW(), $5, NOW())`,
    [userId, alertId, channel, status, error]
  );
}

