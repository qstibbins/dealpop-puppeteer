/**
 * Simple test script to verify scraper is working
 */

import { runPriceCheck } from './scraper.js';

// Test products from different retailers
const testProducts = [
  {
    id: 'test-amazon',
    product_name: 'Amazon Test Product',
    product_url: 'https://www.amazon.com/dp/B0CX23V2ZK',
    current_price: 299.99,
    target_price: 250.00
  },
  {
    id: 'test-walmart',
    product_name: 'Walmart Test Product', 
    product_url: 'https://www.walmart.com/ip/Restored-Apple-iPhone-11-128GB-Black-Unlocked-Refurbished/1989515474',
    current_price: 399.99,
    target_price: 350.00
  }
];

console.log('🧪 Running scraper test with multiple products...\n');

runPriceCheck(testProducts)
  .then(results => {
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(results, null, 2));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Success rate: ${successful}/${results.length} (${(successful/results.length*100).toFixed(0)}%)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed products:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.productId}: ${r.error}`);
      });
    }
    
    process.exit(successful === results.length ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

