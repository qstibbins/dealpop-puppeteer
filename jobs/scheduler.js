/**
 * BullMQ Job Scheduler
 * Schedules price scraping jobs for all tracked products
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { getTrackedProducts } from '../price-scraper/services/database.js';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

const scrapeQueue = new Queue('scrapeQueue', { connection });

/**
 * Schedule scraping jobs for all tracked products
 */
async function scheduleDailyJobs() {
  console.log('\n📅 Scheduling price scraping jobs...');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    // Get all active tracked products
    const products = await getTrackedProducts();
    console.log(`📦 Found ${products.length} products to schedule`);
    
    if (products.length === 0) {
      console.log('✅ No products to schedule. Exiting.');
      return;
    }
    
    // Add each product to the queue
    for (const product of products) {
      await scrapeQueue.add(
        'scrapeProduct',
        { product },
        {
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5 second delay, exponentially increase
          },
          removeOnComplete: true, // Clean up completed jobs
          removeOnFail: false // Keep failed jobs for debugging
        }
      );
    }
    
    console.log(`✅ Successfully scheduled ${products.length} jobs`);
    
    // Get queue stats
    const waiting = await scrapeQueue.getWaitingCount();
    const active = await scrapeQueue.getActiveCount();
    const completed = await scrapeQueue.getCompletedCount();
    const failed = await scrapeQueue.getFailedCount();
    
    console.log('\n📊 Queue Status:');
    console.log(`   Waiting: ${waiting}`);
    console.log(`   Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    
  } catch (error) {
    console.error('❌ Failed to schedule jobs:', error);
    throw error;
  } finally {
    await connection.quit();
  }
}

// Run the scheduler
scheduleDailyJobs()
  .then(() => {
    console.log('\n✅ Scheduler finished. Jobs are queued for processing.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scheduler failed:', error);
    process.exit(1);
  });
