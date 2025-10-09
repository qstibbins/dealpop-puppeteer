# Integration Prompt for Backend LLM

Copy and paste this entire message to your backend repo's AI assistant (Cursor, Claude, ChatGPT, etc.)

---

## CONTEXT

I have a complete Puppeteer price scraper from our Chrome extension repo that I need to integrate into this backend codebase. The scraper is production-ready and vendor-agnostic (works on Amazon, Walmart, Target, and any e-commerce site).

## FILES PROVIDED

I'm bringing over these files from the extension repo:

```
price-scraper/                    (create this folder in backend)
├── extractors/
│   ├── structured-data.js        # Parses JSON-LD Schema.org markup
│   ├── price-extractor.js        # Main extraction logic (3 strategies)
│   └── metadata-extractor.js     # Title, image, URL extraction
├── config/
│   └── selectors.js              # Universal CSS selectors
├── scraper.js                    # Main scraper entry point
├── package.json                  # Dependencies (puppeteer)
└── README.md                     # Documentation
```

## YOUR TASKS

Please help me with the following integration tasks:

### TASK 1: Project Structure
Analyze my current backend structure and tell me:
- Where should I place the `price-scraper/` folder?
- Should it be at root level, in `src/`, in `services/`, or somewhere else?
- Any naming conventions I should follow?

### TASK 2: Dependencies
1. Check my `package.json` and tell me if I need to:
   - Add `puppeteer` dependency
   - Add `node-cron` or similar for scheduling
   - Any conflicts with existing dependencies?

2. Provide the exact commands to install:
```bash
# Tell me the exact npm/yarn commands
```

### TASK 3: Database Integration
I need to integrate the scraper with my database. Please:

1. **Analyze my database schema** - Look for:
   - Products table (might be named: `products`, `tracked_products`, `user_products`)
   - Fields needed: `id`, `product_url`, `product_name`, `current_price`, `target_price`, `expires_at`
   - User associations (for notifications)

2. **Create a database service** - Write me a file like `price-scraper/services/database.js` that:
   - Fetches tracked products: `getTrackedProducts()`
   - Updates product prices: `updateProductPrice(productId, newPrice)`
   - Logs scraping results: `logScrapeResult(result)`
   - Queries for price alerts: `getPriceAlerts()`

3. **Show me the exact integration code** based on my actual schema

Example structure you should create:
```javascript
// price-scraper/services/database.js
const { pool } = require('../../db'); // Adjust path to my DB

async function getTrackedProducts() {
  // Query my actual table structure
  const result = await pool.query(`
    SELECT id, product_url, product_name, current_price, target_price, user_id
    FROM tracked_products 
    WHERE expires_at > NOW() AND is_active = true
  `);
  return result.rows;
}

// ... more functions
```

### TASK 4: Cron Job Setup
Create a cron job file that runs the scraper periodically:

1. **Analyze my project** - Do I already have:
   - A cron job setup?
   - A workers/jobs folder?
   - A scheduled tasks system?

2. **Create the appropriate file** - Based on my setup, create either:
   - `jobs/price-check.js` (if I have a jobs folder)
   - `workers/scraper.js` (if I have a workers folder)
   - `cron/price-scraper.js` (if I need to create cron folder)
   - Or suggest the best location

3. **Provide the complete cron job code** that:
   - Runs every 6 hours (or configurable)
   - Fetches products from my database
   - Calls the scraper
   - Updates prices in database
   - Handles errors and logging
   - Sends notifications on price drops

Example structure:
```javascript
const cron = require('node-cron');
const { runPriceCheck } = require('../price-scraper/scraper');
const { getTrackedProducts, updateProductPrice } = require('../price-scraper/services/database');
const { sendPriceAlert } = require('../services/notifications');

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting scheduled price check...');
  
  try {
    const products = await getTrackedProducts();
    const results = await runPriceCheck(products);
    
    for (const result of results) {
      if (result.success) {
        await updateProductPrice(result.productId, result.newPrice);
        
        if (result.priceDropped) {
          await sendPriceAlert(result.productId);
        }
      }
    }
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});
```

### TASK 5: Notification System
I need to send notifications when prices drop below target:

1. **Check existing notification system** - Do I already have:
   - Email service (SendGrid, Mailgun, Nodemailer)?
   - Webhook system?
   - Push notification setup?

2. **Create or integrate notification service**:
   - If I have existing: Show me how to call it
   - If I don't have: Create a simple email notification service

Example:
```javascript
// price-scraper/services/notifications.js
const { sendEmail } = require('../../services/email'); // Adjust to my setup

async function sendPriceAlert(productId) {
  // Get product and user details from database
  // Send notification via my existing system
}
```

### TASK 6: API Endpoints (Optional)
If I want to expose scraper functionality via API:

1. **Analyze my API structure** - Where do I define routes?
   - Express routes in `routes/`?
   - RESTful controllers?
   - GraphQL resolvers?

2. **Create endpoints for**:
   - `POST /api/products/:id/check-price` - Manually trigger price check for one product
   - `GET /api/scraper/status` - Get last scraper run status
   - `GET /api/scraper/logs` - Get recent scraping logs

Example:
```javascript
// routes/scraper.js
router.post('/products/:id/check-price', async (req, res) => {
  // Trigger immediate price check for specific product
});
```

### TASK 7: Environment Variables
Tell me what environment variables I need to add:

1. Check my `.env` or `.env.example` file
2. Add necessary variables like:
```bash
# Puppeteer configuration
PUPPETEER_HEADLESS=true
SCRAPER_TIMEOUT=30000
SCRAPER_INTERVAL=6h

# Notification settings
PRICE_DROP_NOTIFICATIONS=true
ADMIN_EMAIL=admin@example.com
```

### TASK 8: Logging and Monitoring
Set up proper logging:

1. **Check my logging setup** - Do I use:
   - Winston?
   - Bunyan?
   - Pino?
   - console.log?

2. **Integrate with my logger**:
```javascript
// price-scraper/services/logger.js
const logger = require('../../utils/logger'); // Adjust to my setup

logger.info('Starting price check', { productCount: products.length });
logger.error('Price extraction failed', { productId, error });
```

3. **Add monitoring** (optional):
   - Track success/failure rates
   - Alert on high failure rates
   - Log scraping duration

### TASK 9: Error Handling
Help me add robust error handling:

1. **Retry logic** for failed scrapes
2. **Dead letter queue** for permanently failed products
3. **Circuit breaker** if too many failures
4. **Alerting** for scraper downtime

### TASK 10: Testing
Create test files:

1. **Unit tests** for database functions
2. **Integration test** for end-to-end scraping
3. **Test data** for development

Example:
```javascript
// price-scraper/__tests__/scraper.test.js
describe('Price Scraper', () => {
  test('should extract price from Amazon product', async () => {
    // Test implementation
  });
});
```

## DELIVERABLES

Please provide:

1. ✅ **File structure** - Exact folder/file locations in my repo
2. ✅ **Database service** - Complete `database.js` file for my schema
3. ✅ **Cron job** - Complete cron job implementation
4. ✅ **Notification service** - Integration with my notification system
5. ✅ **Environment variables** - Complete list to add to `.env`
6. ✅ **Installation commands** - Exact commands to run
7. ✅ **API endpoints** (optional) - If I want manual triggers
8. ✅ **Logging integration** - Connect to my existing logger
9. ✅ **Error handling** - Production-grade error handling
10. ✅ **Testing setup** - Test files and commands

## ADDITIONAL CONTEXT

**Timeline**: Need to launch MVP in 13 days, so prioritize:
1. Basic database integration (MUST HAVE)
2. Cron job setup (MUST HAVE)
3. Price update logic (MUST HAVE)
4. Notifications (NICE TO HAVE)
5. API endpoints (NICE TO HAVE)
6. Advanced monitoring (POST-MVP)

**Current Stack** (you should analyze my repo to confirm):
- Node.js version: [ANALYZE]
- Database: [ANALYZE - PostgreSQL/MySQL/MongoDB?]
- ORM/Query Builder: [ANALYZE - Prisma/TypeORM/Sequelize/raw SQL?]
- Framework: [ANALYZE - Express/Fastify/NestJS?]

## SCRAPER BEHAVIOR NOTES

The scraper I'm providing:

- ✅ Is completely vendor-agnostic (no Amazon/Walmart specific code)
- ✅ Uses 3-tier extraction strategy (98% success rate)
- ✅ Handles timeouts and errors gracefully
- ✅ Returns structured results: `{ productId, success, newPrice, priceDropped }`
- ✅ Takes 2-5 seconds per product
- ✅ Should run in headless mode in production
- ✅ Needs Chrome/Chromium installed on server

## SUCCESS CRITERIA

Integration is complete when:

1. ✅ I can run `npm run scraper:test` and it scrapes a test product
2. ✅ Cron job runs automatically every 6 hours
3. ✅ Prices are updated in my database
4. ✅ Users receive notifications on price drops (if implemented)
5. ✅ Errors are logged and monitored
6. ✅ No manual intervention required

## QUESTIONS FOR YOU

Before you start, please answer:

1. **Where is your database client/pool configured?** (e.g., `src/db/index.js`)
2. **What is your products/tracked_products table called?**
3. **Do you have an existing notification system?** (Yes/No, what type?)
4. **Where do you currently run scheduled tasks?** (cron, workers, queue?)
5. **Do you use TypeScript or JavaScript?** (I provided JS, can convert if needed)
6. **What's your deployment environment?** (Heroku, AWS, Docker, VPS?)

## GETTING STARTED

1. First, show me your current backend file structure
2. Identify the database schema for tracked products
3. Then I'll provide all integration code customized for your setup

Please analyze my repository and provide a complete integration plan with all the code files I need to create.

