/**
 * Metadata Extractor
 * Extracts product title, image, and URL metadata
 */

/**
 * Extract product title
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<string|null>}
 */
export async function extractTitle(page) {
  return await page.evaluate(() => {
    console.log('🔍 Extracting product title...');
    
    // Priority order for title extraction
    const candidates = [
      // OG tags (most reliable)
      document.querySelector('meta[property="og:title"]')?.content,
      document.querySelector('meta[name="twitter:title"]')?.content,
      
      // H1 tags
      document.querySelector('h1')?.textContent?.trim(),
      
      // Schema.org markup
      document.querySelector('[itemprop="name"]')?.textContent?.trim(),
      
      // Common class patterns
      document.querySelector('[class*="product-title"]')?.textContent?.trim(),
      document.querySelector('[class*="productTitle"]')?.textContent?.trim(),
      document.querySelector('[id*="product-title"]')?.textContent?.trim(),
      document.querySelector('[id*="productTitle"]')?.textContent?.trim(),
      
      // Fallback to page title
      document.title?.trim()
    ];
    
    // Return first valid title (not too long, not empty)
    for (const candidate of candidates) {
      if (candidate && candidate.length > 0 && candidate.length < 200) {
        console.log(`✅ Found title: "${candidate}"`);
        return candidate;
      }
    }
    
    console.log('❌ No title found');
    return null;
  });
}

/**
 * Extract product image URL
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<string|null>}
 */
export async function extractImage(page) {
  return await page.evaluate(() => {
    console.log('🔍 Extracting product image...');
    
    // Helper to make URLs absolute
    const makeAbsolute = (url) => {
      if (!url) return null;
      try {
        return new URL(url, window.location.href).href;
      } catch {
        return url;
      }
    };
    
    // Priority order for image extraction
    const candidates = [
      // OG tags (most reliable)
      document.querySelector('meta[property="og:image"]')?.content,
      document.querySelector('meta[property="og:image:secure_url"]')?.content,
      document.querySelector('meta[name="twitter:image"]')?.content,
      
      // Schema.org markup
      document.querySelector('[itemprop="image"]')?.src ||
      document.querySelector('[itemprop="image"]')?.content,
      
      // Common product image patterns
      document.querySelector('img[class*="product"]')?.src,
      document.querySelector('img[class*="main"]')?.src,
      document.querySelector('img[id*="product"]')?.src,
      document.querySelector('img[id*="main"]')?.src,
      
      // First large image on page (likely product image)
      Array.from(document.querySelectorAll('img'))
        .filter(img => img.width > 200 && img.height > 200)
        .map(img => img.src)[0]
    ];
    
    // Return first valid image URL
    for (const candidate of candidates) {
      if (candidate) {
        const absoluteUrl = makeAbsolute(candidate);
        if (absoluteUrl && absoluteUrl.startsWith('http')) {
          console.log(`✅ Found image: ${absoluteUrl}`);
          return absoluteUrl;
        }
      }
    }
    
    console.log('❌ No image found');
    return null;
  });
}

/**
 * Extract canonical URL
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<string>}
 */
export async function extractCanonicalUrl(page) {
  return await page.evaluate(() => {
    console.log('🔍 Extracting canonical URL...');
    
    // Priority order for canonical URL
    const candidates = [
      // Canonical link tag
      document.querySelector('link[rel="canonical"]')?.href,
      
      // OG URL
      document.querySelector('meta[property="og:url"]')?.content,
      
      // Current URL
      window.location.href
    ];
    
    for (const candidate of candidates) {
      if (candidate) {
        console.log(`✅ Found canonical URL: ${candidate}`);
        return candidate;
      }
    }
    
    return window.location.href;
  });
}

/**
 * Extract vendor/retailer name from URL
 * @param {string} url - Product URL
 * @returns {string}
 */
export function extractVendor(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '');
    
    // Get main domain name (e.g., "amazon" from "amazon.com")
    const vendorName = domain.split('.')[0];
    
    // Capitalize first letter
    return vendorName.charAt(0).toUpperCase() + vendorName.slice(1);
  } catch {
    return 'Unknown';
  }
}

/**
 * Extract product variants (color, size, capacity, etc.)
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>}
 */
export async function extractVariants(page) {
  return await page.evaluate(() => {
    console.log('🔍 Extracting product variants...');
    
    const variants = {
      color: null,
      capacity: null,
      size: null,
      brand: null
    };
    
    // First try structured data
    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      
      for (const script of jsonLdScripts) {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        
        // Check for @graph
        if (data['@graph']) {
          items.push(...data['@graph']);
        }
        
        for (const item of items) {
          if (item['@type'] === 'Product' || 
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            
            // Extract brand
            if (item.brand) {
              variants.brand = typeof item.brand === 'string' 
                ? item.brand 
                : item.brand.name || item.brand['@value'];
            }
            
            // Extract color from properties
            if (item.color) {
              variants.color = typeof item.color === 'string' 
                ? item.color 
                : item.color.name || item.color['@value'];
            }
            
            // Check for additional properties
            if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
              item.additionalProperty.forEach(prop => {
                const name = (prop.name || '').toLowerCase();
                const value = prop.value || prop['@value'];
                
                if (name.includes('color') || name.includes('colour')) {
                  variants.color = value;
                } else if (name.includes('capacity') || name.includes('storage')) {
                  variants.capacity = value;
                } else if (name.includes('size')) {
                  variants.size = value;
                }
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('⚠️ Error parsing JSON-LD for variants:', e.message);
    }
    
    // Fallback: Try to extract from meta tags
    if (!variants.brand) {
      const brandMeta = document.querySelector('meta[property="og:brand"]') ||
                       document.querySelector('meta[name="brand"]') ||
                       document.querySelector('[itemprop="brand"]');
      if (brandMeta) {
        variants.brand = brandMeta.content || brandMeta.textContent;
      }
    }
    
    // Fallback: Try to extract from page elements
    if (!variants.color) {
      // Common patterns for color selection
      const colorElements = document.querySelectorAll([
        '[class*="color"][class*="selected"]',
        '[class*="colour"][class*="selected"]',
        '[data-color]',
        '#variation_color_name',
        '#native_dropdown_selected_size_name'
      ].join(','));
      
      for (const el of colorElements) {
        const text = el.textContent?.trim() || el.getAttribute('data-color') || el.value;
        if (text && text.length < 50) {
          variants.color = text;
          break;
        }
      }
    }
    
    // Try to extract capacity/storage (common for electronics)
    if (!variants.capacity) {
      const capacityElements = document.querySelectorAll([
        '[class*="capacity"][class*="selected"]',
        '[class*="storage"][class*="selected"]',
        '[data-capacity]',
        '[data-storage]'
      ].join(','));
      
      for (const el of capacityElements) {
        const text = el.textContent?.trim() || el.getAttribute('data-capacity') || el.getAttribute('data-storage');
        if (text && text.length < 50) {
          variants.capacity = text;
          break;
        }
      }
      
      // Also check title for capacity patterns (e.g., "256GB", "1TB")
      const title = document.querySelector('h1')?.textContent || document.title;
      const capacityMatch = title.match(/\b(\d+\s*(GB|TB|MB))\b/i);
      if (capacityMatch && !variants.capacity) {
        variants.capacity = capacityMatch[1];
      }
    }
    
    console.log('✅ Extracted variants:', variants);
    return variants;
  });
}

/**
 * Extract all product metadata
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>}
 */
export async function extractMetadata(page) {
  console.log('📊 Extracting product metadata...');
  
  const [title, image, canonicalUrl, variants] = await Promise.all([
    extractTitle(page),
    extractImage(page),
    extractCanonicalUrl(page),
    extractVariants(page)
  ]);
  
  const vendor = extractVendor(canonicalUrl);
  
  return {
    title: title || 'Unknown Product',
    image: image || null,
    url: canonicalUrl,
    vendor,
    brand: variants.brand || null,
    color: variants.color || null,
    capacity: variants.capacity || null,
    size: variants.size || null
  };
}

