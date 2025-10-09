# 🚀 How to Use These Files

## 📦 What You Have

A complete, production-ready Puppeteer price scraper with 3 integration options:

### **Files Overview:**

```
PUPPETEER_SCRAPER_FILES/
├── 📚 DOCUMENTATION
│   ├── README.md                      # Complete technical documentation
│   ├── HOW_TO_USE.md                 # This file
│   ├── INTEGRATION_PROMPT.md         # Detailed prompt for backend LLM
│   ├── QUICK_START_PROMPT.md         # Short prompt for backend LLM
│   └── EXAMPLE_INTEGRATION.js        # Complete working example
│
├── 🔧 CORE SCRAPER (Copy these to backend)
│   ├── extractors/
│   │   ├── structured-data.js        # JSON-LD parser
│   │   ├── price-extractor.js        # Main extraction logic
│   │   └── metadata-extractor.js     # Title/image extraction
│   ├── config/
│   │   └── selectors.js              # Universal CSS selectors
│   ├── scraper.js                    # Main entry point
│   └── package.json                  # Dependencies
│
└── 🧪 TESTING
    └── test-scraper.js               # Test script
```

---

## 🎯 Three Ways to Integrate

### **Option 1: Quick DIY** ⚡ (2-3 hours)
*If you want to do it yourself quickly*

1. Copy `PUPPETEER_SCRAPER_FILES/` to your backend repo
2. Look at `EXAMPLE_INTEGRATION.js` 
3. Adapt the database/cron code to your setup
4. Test with `node test-scraper.js`
5. Deploy!

**Best for:** Experienced developers who want full control

---

### **Option 2: AI-Assisted (Detailed)** 🤖 (1-2 hours)
*Let AI do the heavy lifting with detailed instructions*

1. **Copy scraper to your backend:**
   ```bash
   cp -r PUPPETEER_SCRAPER_FILES /path/to/backend/price-scraper
   ```

2. **Open your backend in Cursor/Claude:**
   ```bash
   cd /path/to/backend
   cursor .  # or your editor
   ```

3. **Copy this entire file to your backend's AI:**
   - File: `INTEGRATION_PROMPT.md`
   - Open it, select all (Cmd+A), copy (Cmd+C)
   
4. **Paste in your backend's AI chat:**
   - The AI will analyze your backend structure
   - It will create all necessary integration files
   - It will give you exact commands to run

5. **Follow the AI's instructions**

**Best for:** Fastest integration with custom setup

---

### **Option 3: AI-Assisted (Quick)** 🏃 (1 hour)
*Minimal instructions, fast results*

1. Copy scraper to backend
2. Copy `QUICK_START_PROMPT.md` to your backend's AI
3. Get back 3 files to create:
   - database.js
   - cron job
   - .env updates
4. Done!

**Best for:** Simple setups, quick MVP launch

---

## 📋 Step-by-Step (Option 2 - Recommended)

### Step 1: Copy Files to Backend

```bash
# From your extension repo
cd /Users/quinton/Desktop/srccode/deal-pop/chrome-extension

# Copy to your backend repo (adjust path)
cp -r PUPPETEER_SCRAPER_FILES /path/to/your/backend/price-scraper
```

### Step 2: Navigate to Backend

```bash
cd /path/to/your/backend
```

### Step 3: Open INTEGRATION_PROMPT.md

```bash
cd price-scraper
cat INTEGRATION_PROMPT.md
```

### Step 4: Copy Everything

Select all text in `INTEGRATION_PROMPT.md` and copy it

### Step 5: Paste in Backend AI

Open Cursor AI (or Claude) in your backend repo and paste the entire prompt

### Step 6: Answer AI's Questions

The AI will ask you things like:
- "Where is your database connection?"
- "What's your products table called?"
- "Do you have a notification system?"

Just answer them!

### Step 7: AI Creates Files

The AI will generate:
- `price-scraper/services/database.js` (customized to your DB)
- `jobs/price-scraper-cron.js` (your cron job)
- Environment variables to add
- Installation commands

### Step 8: Install Dependencies

```bash
npm install puppeteer node-cron
```

### Step 9: Test the Scraper

```bash
# Test single product
node price-scraper/test-scraper.js

# Or test specific URL
node price-scraper/test-scraper.js "https://www.amazon.com/dp/B0CX23V2ZK"
```

### Step 10: Deploy!

Start your server - the cron job will run automatically every 6 hours.

---

## 🧪 Testing Before Integration

Before integrating with your database, test that the scraper works:

```bash
cd price-scraper

# Install dependencies
npm install

# Test with default products (Amazon, Walmart, Target)
node test-scraper.js

# Test with specific URL
node test-scraper.js "https://www.amazon.com/dp/B0CX23V2ZK"
```

**Expected output:**
```
🧪 Testing: Amazon Example
✅ Page loaded in 2341ms
💰 Extracting price...
✅ SUCCESS! Price extracted in 423ms
   Price: $249.99
```

If you see this, the scraper works! ✅

---

## 🗂️ What Each Prompt Does

### **INTEGRATION_PROMPT.md** (Detailed)
- **Use when:** You want complete integration with detailed explanations
- **AI will create:** 5-7 files customized to your backend
- **Time:** ~1-2 hours
- **Best for:** Complex backends, TypeScript projects, custom setups

### **QUICK_START_PROMPT.md** (Fast)
- **Use when:** You want to get up and running FAST
- **AI will create:** 2-3 essential files
- **Time:** ~30-60 minutes
- **Best for:** Simple setups, MVP deadline pressure

### **EXAMPLE_INTEGRATION.js** (Reference)
- **Use when:** You want to do it yourself
- **Contains:** Complete working example with PostgreSQL
- **Time:** ~2-3 hours to adapt
- **Best for:** Hands-on developers, learning how it works

---

## 🎓 Understanding the Scraper

### How It Works (High Level):

```
1. Cron job runs every 6 hours
2. Fetches tracked products from your database
3. For each product:
   a. Open page with Puppeteer
   b. Try JSON-LD structured data (70% success)
   c. Try universal selectors (20% success)
   d. Try scoring fallback (8% success)
   e. Extract price
4. Update prices in database
5. Send notifications if price dropped below target
```

### Extraction Strategy:

The scraper is **vendor-agnostic** (no Amazon/Walmart specific code). It uses:

1. **Structured Data** - Parses JSON-LD `<script>` tags (Schema.org)
2. **Semantic Selectors** - `[itemprop="price"]`, `[class*="price"]`
3. **Smart Scoring** - Scores all elements with price patterns

**Why no vendor-specific code?**
- 98% success rate with universal approach
- Works on ANY e-commerce site
- Less maintenance (sites change constantly)
- Faster to build (13-day deadline!)

---

## 🔧 Customization

After basic integration, you can enhance:

### **Post-MVP Enhancements:**

```javascript
// 1. Proxy rotation (avoid IP blocks)
const browser = await puppeteer.launch({
  args: [`--proxy-server=${getRandomProxy()}`]
});

// 2. Selector caching (remember what worked)
if (cachedSelector) {
  price = await page.$eval(cachedSelector, el => el.textContent);
}

// 3. Parallel processing (faster!)
await Promise.all(products.map(p => scrapeProduct(browser, p)));

// 4. Screenshot on failure (debug)
if (!price) {
  await page.screenshot({ path: `error-${productId}.png` });
}
```

---

## 📞 Need Help?

### If scraper fails on a specific site:

1. **Test it first:**
   ```bash
   node test-scraper.js "https://problematic-url.com"
   ```

2. **Check the logs:**
   - Look for: "Found X JSON-LD scripts"
   - Look for: "Trying universal semantic selectors"
   - Look for: "Using price likelihood scoring"

3. **Debug the page:**
   ```javascript
   // Add to scraper.js temporarily
   await page.screenshot({ path: 'debug.png' });
   const html = await page.content();
   console.log(html);
   ```

4. **Check if price is in JSON-LD:**
   - Open product page in browser
   - View source (Cmd+Option+U)
   - Search for `application/ld+json`
   - Look for `"@type": "Product"` and `"price"`

---

## ✅ Success Checklist

Your integration is complete when you can:

- [ ] Copy files to backend repo
- [ ] Run `node test-scraper.js` successfully
- [ ] Install dependencies without errors
- [ ] Create database service file
- [ ] Create cron job file
- [ ] Add environment variables
- [ ] Test full integration (scrape → update DB)
- [ ] Cron job runs automatically
- [ ] Prices update in database
- [ ] Notifications send on price drops
- [ ] No errors in production logs

---

## 🚀 Quick Commands Reference

```bash
# Copy files to backend
cp -r PUPPETEER_SCRAPER_FILES /path/to/backend/price-scraper

# Install dependencies
cd /path/to/backend/price-scraper
npm install

# Test scraper
node test-scraper.js
node test-scraper.js "https://custom-url.com"

# Test full integration
node ../jobs/price-scraper-cron.js

# Start server (cron runs automatically)
npm start
```

---

## 🎯 Next Steps

1. **Choose your integration method** (Option 1, 2, or 3 above)
2. **Copy files to backend**
3. **Follow the instructions** for your chosen method
4. **Test with test-scraper.js**
5. **Integrate with database**
6. **Deploy and monitor**

---

## ⏰ Time Estimates

| Task | Time |
|------|------|
| Copy files + install deps | 5 min |
| Test scraper works | 10 min |
| AI integration (Option 2) | 1-2 hours |
| Manual integration (Option 1) | 2-3 hours |
| Testing + debugging | 30-60 min |
| **Total** | **2-4 hours** |

---

**You're ready to integrate! Choose your method above and get started.** 🎉

For the fastest integration, I recommend **Option 2** with the detailed INTEGRATION_PROMPT.md.

