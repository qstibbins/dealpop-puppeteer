/**
 * Price Tracking Scraper
 * Cron job that checks prices for tracked products
 */

import { chromium } from 'playwright';
import { extractPrice } from './extractors/price-extractor.js';
import { extractMetadata } from './extractors/metadata-extractor.js';
import { logScrapingError, retryWithBackoff } from '../utils/errorHandling.js';

/**
 * Scrape price for a single product
 * @param {Browser} browser - Playwright browser instance
 * @param {Object} product - Product object with id and product_url
 * @returns {Promise<Object>} - Result with price or error
 */
export async function scrapeProduct(browser, product) {
  let page;
  const processingStart = Date.now();
  
  try {
    page = await browser.newPage();
    
    // Enhanced product context logging
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🛍️  SCRAPING PRODUCT`);
    console.log(`${'='.repeat(80)}`);
    console.log(`👤 User: ${product.display_name || 'Unknown'} (${product.email})`);
    console.log(`🆔 Product ID: ${product.id}`);
    console.log(`📦 Product: ${product.product_name || 'Unknown Product'}`);
    console.log(`🏪 Vendor: ${product.vendor || 'Unknown'}`);
    console.log(`🌐 URL: ${product.product_url}`);
    console.log(`💰 Current Price: $${product.current_price || 'N/A'}`);
    console.log(`🎯 Target Price: $${product.target_price || 'N/A'}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}`);
    
    // Set user agent to avoid bot detection
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Navigate to product page
    console.log(`🌐 Navigating to: ${product.product_url}`);
    const navigationStart = Date.now();
    await page.goto(product.product_url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    const navigationTime = Date.now() - navigationStart;
    console.log(`✅ Navigation completed in ${navigationTime}ms`);
    
    // Add a small delay to let dynamic content load
    console.log(`⏳ Waiting for dynamic content to load...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract price with detailed logging
    console.log(`🔍 Starting price extraction...`);
    const extractionStart = Date.now();
    const newPrice = await extractPrice(page);
    const extractionTime = Date.now() - extractionStart;
    
    if (!newPrice || newPrice <= 0) {
      throw new Error('Invalid price extracted');
    }
    
    console.log(`✅ Price extraction completed in ${extractionTime}ms`);
    
    // Enhanced success logging
    console.log(`\n✅ EXTRACTION SUCCESS!`);
    console.log(`   📦 Product: ${product.product_name || 'Unknown'}`);
    console.log(`   💰 Old Price: $${product.current_price || 'N/A'}`);
    console.log(`   💰 New Price: $${newPrice}`);
    console.log(`   🎯 Target Price: $${product.target_price || 'N/A'}`);
    
    // Calculate price change
    if (product.current_price) {
      const priceChange = newPrice - product.current_price;
      const percentChange = ((priceChange / product.current_price) * 100).toFixed(2);
      console.log(`   📈 Price Change: $${priceChange > 0 ? '+' : ''}${priceChange} (${percentChange > 0 ? '+' : ''}${percentChange}%)`);
    }
    
    // Check if price dropped below target
    const priceDropped = product.target_price && newPrice <= product.target_price;
    if (priceDropped) {
      console.log(`   🎉 PRICE ALERT: Target price reached!`);
      console.log(`   💡 Savings: $${(product.current_price || 0) - newPrice}`);
    }
    
    const totalProcessingTime = Date.now() - processingStart;
    console.log(`   ⏱️  Total Processing Time: ${totalProcessingTime}ms`);
    
    await page.close();
    
    return {
      productId: product.id,
      success: true,
      newPrice,
      oldPrice: product.current_price,
      priceDropped,
      timestamp: new Date().toISOString(),
      processingTime: totalProcessingTime,
      navigationTime,
      extractionTime
    };
    
  } catch (error) {
    const totalProcessingTime = Date.now() - processingStart;
    
    // Use enhanced error logging
    logScrapingError(error, product, 'price extraction');
    
    // Clean up page if it exists
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.warn('⚠️ Error closing page:', closeError.message);
      }
    }
    
    return {
      productId: product.id,
      success: false,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      url: product.product_url,
      userEmail: product.email,
      processingTime: totalProcessingTime,
      errorId: error.errorId || null
    };
  }
}

/**
 * Main scraper function - checks all tracked products
 * @param {Array} products - Array of product objects to check
 * @returns {Promise<Array>} - Array of results
 */
export async function runPriceCheck(products) {
  const jobStartTime = Date.now();
  console.log(`\n🚀 STARTING PRICE CHECK`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📦 Products to process: ${products.length}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let alertCount = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const productStartTime = Date.now();
    
    console.log(`\n📋 Processing product ${i + 1}/${products.length}`);
    console.log(`   📦 ${product.product_name || 'Unknown Product'}`);
    console.log(`   👤 ${product.display_name || 'Unknown'} (${product.email})`);
    
    let retryCount = 0;
    const maxRetries = 2;
    let browser = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Create fresh browser for each product (Playwright stability fix)
        console.log(`🔄 Creating fresh browser for product ${product.id} (attempt ${retryCount + 1})...`);
        const browserStartTime = Date.now();
        
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        
        const browserTime = Date.now() - browserStartTime;
        console.log(`✅ Browser created in ${browserTime}ms`);
        
        const result = await scrapeProduct(browser, product);
        results.push(result);
        
        // Track statistics
        if (result.success) {
          successCount++;
          if (result.priceDropped) {
            alertCount++;
          }
        } else {
          failureCount++;
        }
        
        // Close browser immediately after successful scrape
        await browser.close();
        console.log(`✅ Browser closed for product ${product.id}`);
        
        const productTime = Date.now() - productStartTime;
        console.log(`⏱️  Product ${i + 1} completed in ${productTime}ms`);
        
        // Add delay between requests to be polite
        console.log(`⏳ Waiting 2 seconds before next product...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`❌ Failed to scrape product ${product.id} (attempt ${retryCount + 1}):`, error.message);
        
        // Close browser on error
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.warn('⚠️ Error closing browser:', closeError.message);
          }
        }
        
        retryCount++;
        
        if (retryCount > maxRetries) {
          // Max retries reached, add failure result
          results.push({
            productId: product.id,
            success: false,
            error: error.message,
            errorType: error.name,
            timestamp: new Date().toISOString(),
            url: product.product_url,
            userEmail: product.email
          });
          failureCount++;
          break;
        } else {
          // Wait before retry
          console.log(`🔄 Retrying product ${product.id} in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // Progress update
    const progress = ((i + 1) / products.length * 100).toFixed(1);
    console.log(`📊 Progress: ${i + 1}/${products.length} (${progress}%) - ✅ ${successCount} successful, ❌ ${failureCount} failed`);
  }
  
  const totalJobTime = Date.now() - jobStartTime;
  
  // Enhanced Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 PRICE CHECK SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`⏰ Completed: ${new Date().toISOString()}`);
  console.log(`⏱️  Total Job Time: ${totalJobTime}ms (${(totalJobTime/1000).toFixed(2)}s)`);
  console.log(`📦 Total Products: ${products.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`🎉 Price Alerts: ${alertCount}`);
  console.log(`📈 Success Rate: ${((successCount / products.length) * 100).toFixed(1)}%`);
  console.log(`⏱️  Average Time per Product: ${(totalJobTime / products.length).toFixed(0)}ms`);
  
  // Show failed products for debugging
  const failedProducts = results.filter(r => !r.success);
  if (failedProducts.length > 0) {
    console.log(`\n❌ FAILED PRODUCTS:`);
    failedProducts.forEach((result, index) => {
      console.log(`   ${index + 1}. Product ID: ${result.productId}`);
      console.log(`      Error: ${result.error}`);
      console.log(`      URL: ${result.url}`);
    });
  }
  
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

