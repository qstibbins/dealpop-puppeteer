/**
 * Legacy variant scraper (deprecated)
 * Use price-scraper/scraper.js for universal price extraction
 * 
 * This file is kept for backwards compatibility with variant-specific scraping
 */

import puppeteer from 'puppeteer';
import { extractPrice } from './price-scraper/extractors/price-extractor.js';

/**
 * @deprecated Use price-scraper/scraper.js instead
 * This function handles variant selection but you should prefer the universal scraper
 */
async function scrapeVariantPriceSafe(url, priceSelector, variantSelectors = []) {
  console.warn('⚠️  scrapeVariantPriceSafe is deprecated. Consider using price-scraper/scraper.js');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Handle variant selections if provided
    for (let variant of variantSelectors) {
      try {
        await page.waitForSelector(variant.selector, { timeout: 5000 });
        const el = await page.$(variant.selector);
        const tag = await page.evaluate(el => el.tagName.toLowerCase(), el);

        if (tag === 'select') {
          await page.select(variant.selector, variant.value);
        } else {
          await el.click();
        }

        await page.waitForTimeout(1000);
      } catch (err) {
        console.warn(`Variant selection failed for ${variant.selector}: ${err.message}`);
      }
    }

    // Use universal price extraction
    const price = await extractPrice(page);
    await browser.close();
    return price;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export { scrapeVariantPriceSafe };