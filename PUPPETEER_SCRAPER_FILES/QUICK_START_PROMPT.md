# Quick Start Prompt (For Backend LLM)

**Copy this to your backend repo's AI assistant for fast integration**

---

## What I Have

I have a complete Puppeteer price scraper with these files:
- `extractors/price-extractor.js` - Universal price extraction
- `extractors/structured-data.js` - JSON-LD parser
- `extractors/metadata-extractor.js` - Title/image extraction
- `config/selectors.js` - CSS selectors
- `scraper.js` - Main entry point
- `package.json` - Dependencies

## What I Need You To Do

**1. Analyze My Backend**
- Look at my file structure and database schema
- Find my `tracked_products` (or similar) table
- Identify how I handle scheduled tasks

**2. Create Database Service**
Create `price-scraper/services/database.js` that:
```javascript
// Connect to MY actual database
// Provide these functions:
async function getTrackedProducts() { /* query my DB */ }
async function updateProductPrice(id, price) { /* update my DB */ }
async function logScrapeResult(result) { /* log to my DB */ }
```

**3. Create Cron Job**
Create a cron job file that:
- Runs every 6 hours
- Calls `getTrackedProducts()` from database service
- Calls `runPriceCheck(products)` from scraper
- Updates prices in my database
- Sends notifications on price drops (if I have notification system)

**4. Setup Instructions**
Give me:
- Where to put the files in MY repo structure
- What to add to MY `.env` file
- Commands to install dependencies
- How to test it: `npm run scraper:test`
- How to start the cron job

## My Stack (you should detect this)
- Database: [PostgreSQL/MySQL/MongoDB?]
- ORM: [Prisma/TypeORM/Sequelize/raw SQL?]
- Framework: [Express/Fastify/NestJS?]
- Language: [TypeScript/JavaScript?]

## Expected Output

Provide me with:
1. Complete `database.js` file (customized to MY schema)
2. Complete cron job file (in the right location for MY setup)
3. Installation commands
4. Environment variables to add
5. Test command to verify it works

## MVP Priority (13-day deadline)
Focus on:
1. ✅ Database integration - MUST HAVE
2. ✅ Cron job - MUST HAVE  
3. ✅ Price updates - MUST HAVE
4. 🔜 Notifications - NICE TO HAVE (can add later)

Let's get this working in the next 2-3 hours!

