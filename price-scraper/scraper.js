/**
 * Price Tracking Scraper
 * Cron job that checks prices for tracked products
 */

import { chromium } from 'playwright';
import { extractPrice } from './extractors/price-extractor.js';
import { extractMetadata } from './extractors/metadata-extractor.js';

/**
 * Scrape price for a single product
 * @param {Browser} browser - Puppeteer browser instance
 * @param {Object} product - Product object with id and product_url
 * @returns {Promise<Object>} - Result with price or error
 */
export async function scrapeProduct(browser, product) {
  let page;
  try {
    page = await browser.newPage();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🛍️  Scraping: ${product.product_name || product.product_url}`);
    console.log(`${'='.repeat(80)}`);
    
    // Set user agent to avoid bot detection
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Navigate to product page
    console.log(`🌐 Navigating to: ${product.product_url}`);
    await page.goto(product.product_url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Add a small delay to let dynamic content load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract price
    const newPrice = await extractPrice(page);
    
    console.log(`\n✅ SUCCESS!`);
    console.log(`   Product: ${product.product_name || 'Unknown'}`);
    console.log(`   Old Price: $${product.current_price || 'N/A'}`);
    console.log(`   New Price: $${newPrice}`);
    console.log(`   Target Price: $${product.target_price || 'N/A'}`);
    
    // Check if price dropped below target
    const priceDropped = product.target_price && newPrice <= product.target_price;
    if (priceDropped) {
      console.log(`   🎉 PRICE ALERT: Target price reached!`);
    }
    
    await page.close();
    
    return {
      productId: product.id,
      success: true,
      newPrice,
      oldPrice: product.current_price,
      priceDropped,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    if (page) {
      await page.close();
    }
    
    return {
      productId: product.id,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Main scraper function - checks all tracked products
 * @param {Array} products - Array of product objects to check
 * @returns {Promise<Array>} - Array of results
 */
export async function runPriceCheck(products) {
  console.log(`\n🚀 Starting price check for ${products.length} products...`);
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process'
    ]
  });
  
  const results = [];
  
  for (const product of products) {
    try {
      const result = await scrapeProduct(browser, product);
      results.push(result);
      
      // Add delay between requests to be polite
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to scrape product ${product.id}:`, error);
      results.push({
        productId: product.id,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  await browser.close();
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total products: ${products.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Price alerts: ${results.filter(r => r.priceDropped).length}`);
  console.log(`${'='.repeat(80)}\n`);
  
  return results;
}

/**
 * Example: Test scraper with a single product
 */
export async function testScraper() {
  const testProduct = {
    id: 'test-1',
    product_name: 'Test Product',
    product_url: process.argv[2] || 'https://www.amazon.com/dp/B0CX23V2ZK', // Example product
    current_price: 100,
    target_price: 90
  };
  
  const results = await runPriceCheck([testProduct]);
  console.log('\nResults:', JSON.stringify(results, null, 2));
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testScraper().catch(console.error);
}

