/**
 * Structured Data Extractor
 * Extracts product price from JSON-LD Schema.org markup
 * This works universally across most e-commerce sites
 */

/**
 * Extract price from JSON-LD structured data
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<number|null>} - Price or null if not found
 */
export async function extractPriceFromStructuredData(page) {
  return await page.evaluate(() => {
    console.log('🔍 Attempting structured data extraction...');
    
    // Look for JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.log(`📊 Found ${jsonLdScripts.length} JSON-LD scripts`);
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        
        // Handle both single object and array of objects
        const items = Array.isArray(data) ? data : [data];
        
        // Also check for @graph (common in Schema.org)
        if (data['@graph']) {
          items.push(...data['@graph']);
        }
        
        for (const item of items) {
          // Check if it's a Product schema
          if (item['@type'] === 'Product' || 
              item['@type'] === 'http://schema.org/Product' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            
            console.log('✅ Found Product schema');
            
            // Look for offers with price
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
              
              // Collect all valid prices
              const validPrices = [];
              for (const offer of offers) {
                if (offer.price) {
                  const price = parseFloat(offer.price);
                  if (!isNaN(price) && price > 0) {
                    validPrices.push(price);
                  }
                }
              }
              
              if (validPrices.length > 0) {
                // Return the highest price (main product price vs add-ons/shipping)
                const selectedPrice = Math.max(...validPrices);
                console.log(`💰 Extracted price from structured data: $${selectedPrice}`);
                return selectedPrice;
              }
            }
            
            // Also check for direct price property
            if (item.price) {
              const price = parseFloat(item.price);
              if (!isNaN(price) && price > 0) {
                console.log(`💰 Extracted price from structured data: $${price}`);
                return price;
              }
            }
          }
        }
      } catch (e) {
        console.error('⚠️ Error parsing JSON-LD:', e.message);
        continue;
      }
    }
    
    console.log('❌ No structured data price found');
    return null;
  });
}

