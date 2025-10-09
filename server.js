import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.SCRAPER_PORT || 8000;

console.log('🕷️  DealPop Puppeteer Scraper Service Starting...');

// Example usage of the scraper
async function testScraper() {
  try {
    console.log('🧪 Testing scraper functionality...');
    
    // This is just a test - in production you'd have actual scraping jobs
    console.log('✅ Scraper service is ready');
    console.log(`📡 Scraper service listening on port ${PORT}`);
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
  }
}

// Start the scraper service
testScraper();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Scraper service shutting down...');
  process.exit(0);
}); 