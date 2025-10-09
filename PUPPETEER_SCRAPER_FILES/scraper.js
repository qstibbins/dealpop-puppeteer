/**
 * Price Tracking Scraper
 * Cron job that checks prices for tracked products
 */

const puppeteer = require('puppeteer');
const { extractPrice } = require('./extractors/price-extractor');
const { extractMetadata } = require('./extractors/metadata-extractor');

/**
 * Scrape price for a single product
 * @param {Browser} browser - Puppeteer browser instance
 * @param {Object} product - Product object with id and productUrl
 * @returns {Promise<Object>} - Result with price or error
 */
async function scrapeProduct(browser, product) {
  const page = await browser.newPage();
  
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🛍️  Scraping: ${product.productName || product.productUrl}`);
    console.log(`${'='.repeat(80)}`);
    
    // Set user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Navigate to product page
    console.log(`🌐 Navigating to: ${product.productUrl}`);
    await page.goto(product.productUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Add a small delay to let dynamic content load
    await page.waitForTimeout(2000);
    
    // Extract price
    const newPrice = await extractPrice(page);
    
    console.log(`\n✅ SUCCESS!`);
    console.log(`   Product: ${product.productName || 'Unknown'}`);
    console.log(`   Old Price: $${product.currentPrice || 'N/A'}`);
    console.log(`   New Price: $${newPrice}`);
    console.log(`   Target Price: $${product.targetPrice || 'N/A'}`);
    
    // Check if price dropped below target
    const priceDropped = product.targetPrice && newPrice <= product.targetPrice;
    if (priceDropped) {
      console.log(`   🎉 PRICE ALERT: Target price reached!`);
    }
    
    await page.close();
    
    return {
      productId: product.id,
      success: true,
      newPrice,
      oldPrice: product.currentPrice,
      priceDropped,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    await page.close();
    
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
async function runPriceCheck(products) {
  console.log(`\n🚀 Starting price check for ${products.length} products...`);
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
async function testScraper() {
  const testProduct = {
    id: 'test-1',
    productName: 'Test Product',
    productUrl: process.argv[2] || 'https://www.amazon.com/dp/B0CX23V2ZK', // Example product
    currentPrice: 100,
    targetPrice: 90
  };
  
  const results = await runPriceCheck([testProduct]);
  console.log('\nResults:', JSON.stringify(results, null, 2));
}

// Run test if executed directly
if (require.main === module) {
  testScraper().catch(console.error);
}

module.exports = {
  scrapeProduct,
  runPriceCheck
};

