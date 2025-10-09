/**
 * Universal CSS Selectors
 * Vendor-agnostic selectors that work across most e-commerce sites
 */

const UNIVERSAL_SELECTORS = [
  // Schema.org microdata
  '[itemprop*="price"]',
  '[itemprop="price"]',
  
  // Generic semantic selectors (most common)
  '[class*="price"]',
  '[id*="price"]',
  '[data-price]',
  '[data-testid*="price"]',
  '[aria-label*="price"]',
  
  // Specific price-related classes
  '[class*="current-price"]',
  '[class*="currentPrice"]',
  '[class*="sale-price"]',
  '[class*="salePrice"]',
  '[class*="final-price"]',
  '[class*="finalPrice"]',
  '[class*="product-price"]',
  '[class*="productPrice"]',
  
  // Amount/cost alternatives
  '[class*="amount"]',
  '[class*="cost"]',
  '[data-amount]',
  
  // Common pricing elements
  '.price',
  '.price-now',
  '.sale-price',
  '.current-price',
  '.product-price',
  '#price',
  '#product-price',
  
  // Data attributes
  '[data-testid*="amount"]',
  '[title*="price"]'
];

/**
 * Selectors to avoid (typically old/comparison prices)
 */
const EXCLUDE_SELECTORS = [
  '[class*="was"]',
  '[class*="original"]',
  '[class*="list-price"]',
  '[class*="listPrice"]',
  '[class*="msrp"]',
  '[class*="compare"]',
  '[class*="strike"]',
  '[class*="old"]',
  'strike',
  's',
  'del'
];

module.exports = {
  UNIVERSAL_SELECTORS,
  EXCLUDE_SELECTORS
};

