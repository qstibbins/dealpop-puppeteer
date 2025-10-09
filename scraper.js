/**
 * Legacy scraper (deprecated)
 * Use price-scraper/scraper.js instead
 * 
 * This file is kept for backwards compatibility
 */

import { extractPrice } from './price-scraper/extractors/price-extractor.js';
import puppeteer from 'puppeteer';

/**
 * @deprecated Use price-scraper/scraper.js instead
 */
export async function scrapePrice(url) {
  console.warn('⚠️  scraper.js is deprecated. Use price-scraper/scraper.js instead');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const price = await extractPrice(page);
    await browser.close();
    return price;
  } catch (error) {
    await browser.close();
    throw error;
  }
}