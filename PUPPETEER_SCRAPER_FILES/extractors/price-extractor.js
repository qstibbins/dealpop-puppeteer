/**
 * Universal Price Extractor
 * Vendor-agnostic price extraction for e-commerce sites
 */

const { extractPriceFromStructuredData } = require('./structured-data');
const { UNIVERSAL_SELECTORS } = require('../config/selectors');

/**
 * Check if text contains a price pattern
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function containsPrice(text) {
  return /\$[\d,]+(\.\d{2})?/.test(text) || /\d+\.\d{2}/.test(text);
}

/**
 * Extract clean numeric price from text
 * @param {string} text - Raw price text
 * @returns {number|null}
 */
function extractNumericPrice(text) {
  const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
  if (priceMatch) {
    const numericPrice = priceMatch[1].replace(/,/g, '');
    return parseFloat(numericPrice);
  }
  return null;
}

/**
 * Score element likelihood of being a price
 * Higher score = more likely to be the correct price
 * @param {Element} element - DOM element
 * @returns {number}
 */
function getPriceLikelihoodScore(element) {
  let score = 0;
  const text = element.textContent || '';
  const className = element.className || '';
  const id = element.id || '';
  const tagName = element.tagName.toLowerCase();
  
  // Positive signals
  if (/\bprice\b/i.test(className)) score += 5;
  if (/\bprice\b/i.test(id)) score += 5;
  if (/\bcurrent\b/i.test(className)) score += 4;
  if (/\bnow\b/i.test(className)) score += 4;
  if (/\bsale\b/i.test(className)) score += 3;
  if (/\bfinal\b/i.test(className)) score += 3;
  if (/\bretail\b/i.test(className)) score += 2;
  if (/\bamount\b/i.test(className)) score += 2;
  
  // Negative signals (old/comparison prices)
  if (/\bstrike\b/i.test(className)) score -= 5;
  if (/\bwas\b/i.test(className)) score -= 5;
  if (/\blist\b/i.test(className)) score -= 5;
  if (/\boriginal\b/i.test(className)) score -= 5;
  if (/\bmsrp\b/i.test(className)) score -= 5;
  if (/\bcompare\b/i.test(className)) score -= 3;
  if (/\bshipping\b/i.test(className)) score -= 3;
  if (/\btax\b/i.test(className)) score -= 3;
  
  // Tag-based scoring
  if (tagName === 'span' && /\$[\d,]+(\.\d{2})?/.test(text)) score += 2;
  if (tagName === 'div' && /\$[\d,]+(\.\d{2})?/.test(text)) score += 1;
  
  // Clean price format (just the price, nothing else)
  if (text.match(/^\$[\d,]+(\.\d{2})?$/)) score += 3;
  
  return score;
}

/**
 * Extract price using universal semantic selectors
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<number|null>}
 */
async function extractUniversalPrice(page) {
  return await page.evaluate((selectors) => {
    console.log('🔍 Trying universal semantic selectors...');
    
    // Helper: check if text contains price
    const containsPrice = (text) => {
      return /\$[\d,]+(\.\d{2})?/.test(text) || /\d+\.\d{2}/.test(text);
    };
    
    // Helper: extract numeric price
    const extractNumericPrice = (text) => {
      const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        const numericPrice = priceMatch[1].replace(/,/g, '');
        return parseFloat(numericPrice);
      }
      return null;
    };
    
    // Try each universal selector
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && containsPrice(element.textContent || '')) {
          const price = extractNumericPrice(element.textContent || '');
          if (price && price > 0) {
            console.log(`✅ Universal selector found price: ${selector} = $${price}`);
            return price;
          }
        }
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }
    
    console.log('❌ No price found with universal selectors');
    return null;
  }, UNIVERSAL_SELECTORS);
}

/**
 * Extract price with scoring fallback (last resort)
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<number|null>}
 */
async function extractWithScoring(page) {
  return await page.evaluate(() => {
    console.log('🔍 Using price likelihood scoring fallback...');
    
    // Helper functions (inline for page.evaluate)
    const containsPrice = (text) => {
      return /\$[\d,]+(\.\d{2})?/.test(text) || /\d+\.\d{2}/.test(text);
    };
    
    const extractNumericPrice = (text) => {
      const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        return parseFloat(priceMatch[1].replace(/,/g, ''));
      }
      return null;
    };
    
    const getPriceLikelihoodScore = (element) => {
      let score = 0;
      const className = element.className || '';
      const id = element.id || '';
      
      if (/\bprice\b/i.test(className)) score += 5;
      if (/\bprice\b/i.test(id)) score += 5;
      if (/\bcurrent\b/i.test(className)) score += 4;
      if (/\bnow\b/i.test(className)) score += 4;
      if (/\bstrike\b/i.test(className)) score -= 5;
      if (/\bwas\b/i.test(className)) score -= 5;
      if (/\boriginal\b/i.test(className)) score -= 5;
      
      return score;
    };
    
    // Find all elements with price-like text
    const allElements = Array.from(document.querySelectorAll('body *'))
      .filter(el => {
        const text = el.textContent || '';
        return containsPrice(text) && text.length < 50; // Avoid large blocks
      })
      .sort((a, b) => getPriceLikelihoodScore(b) - getPriceLikelihoodScore(a));
    
    if (allElements.length > 0) {
      const bestElement = allElements[0];
      const price = extractNumericPrice(bestElement.textContent || '');
      if (price && price > 0) {
        console.log(`✅ Scoring found price: $${price}`);
        return price;
      }
    }
    
    console.log('❌ No price found with scoring');
    return null;
  });
}

/**
 * Main price extraction function - tries all methods in order
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<number>} - Extracted price
 * @throws {Error} - If no price could be extracted
 */
async function extractPrice(page) {
  console.log('🚀 Starting universal price extraction...');
  
  // Wait for page to be fully loaded
  await page.waitForSelector('body', { timeout: 10000 });
  
  // Strategy 1: Try structured data (works ~70% of the time)
  try {
    const structuredPrice = await extractPriceFromStructuredData(page);
    if (structuredPrice !== null && structuredPrice > 0) {
      console.log(`✅ SUCCESS: Extracted price from structured data: $${structuredPrice}`);
      return structuredPrice;
    }
  } catch (error) {
    console.warn('⚠️ Structured data extraction failed:', error.message);
  }
  
  // Strategy 2: Try universal semantic selectors (works ~20% of the time)
  try {
    const universalPrice = await extractUniversalPrice(page);
    if (universalPrice !== null && universalPrice > 0) {
      console.log(`✅ SUCCESS: Extracted price from universal selectors: $${universalPrice}`);
      return universalPrice;
    }
  } catch (error) {
    console.warn('⚠️ Universal selector extraction failed:', error.message);
  }
  
  // Strategy 3: Try scoring fallback (works ~8% of the time)
  try {
    const scoredPrice = await extractWithScoring(page);
    if (scoredPrice !== null && scoredPrice > 0) {
      console.log(`✅ SUCCESS: Extracted price from scoring: $${scoredPrice}`);
      return scoredPrice;
    }
  } catch (error) {
    console.warn('⚠️ Scoring extraction failed:', error.message);
  }
  
  // All strategies failed
  throw new Error('Could not extract price from page');
}

module.exports = {
  extractPrice,
  extractPriceFromStructuredData,
  extractUniversalPrice,
  extractWithScoring,
  containsPrice,
  extractNumericPrice,
  getPriceLikelihoodScore
};

