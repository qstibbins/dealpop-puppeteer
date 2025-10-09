/**
 * BullMQ Worker for Price Scraping
 * Processes individual product scrape jobs from the queue
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { updateProductPrice, logNotification, markAlertTriggered, getProductForNotification } from '../price-scraper/services/database.js';
import { scrapeProduct } from '../price-scraper/scraper.js';
import { notifyUser } from '../utils/notifyUser.js';
import puppeteer from 'puppeteer';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Launch browser once for all jobs (reuse for better performance)
let browser;

const worker = new Worker('scrapeQueue', async job => {
  const { product } = job.data;
  
  console.log(`\n🔄 Processing job ${job.id} for product ${product.id}`);
  
  try {
    // Initialize browser if not already running
    if (!browser) {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    // Scrape the product
    const result = await scrapeProduct(browser, product);
    
    if (result.success) {
      // Update database
      await updateProductPrice(result.productId, result.newPrice);
      
      // Check if price dropped below target
      if (result.priceDropped) {
        console.log(`🎉 Price alert triggered for product ${result.productId}`);
        
        // Get full product details with user info
        const productDetails = await getProductForNotification(result.productId);
        
        // Send email notification
        try {
          await notifyUser(
            productDetails.email,
            productDetails.product_name,
            result.newPrice,
            productDetails.product_url
          );
          console.log(`📧 Notification sent to ${productDetails.email}`);
        } catch (error) {
          console.error(`❌ Failed to send notification: ${error.message}`);
        }
      }
      
      return { success: true, price: result.newPrice };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    throw error;
  }
}, { connection });

worker.on('completed', job => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  if (browser) {
    await browser.close();
  }
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log('🚀 Worker started and waiting for jobs...');
