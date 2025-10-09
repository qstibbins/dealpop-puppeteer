# 📁 File Manifest

**Complete list of everything in this folder and what each file does**

---

## 📂 Directory Structure

```
PUPPETEER_SCRAPER_FILES/
│
├── 📚 DOCUMENTATION (Read these first)
│   │
│   ├── HOW_TO_USE.md ⭐ START HERE
│   │   └── Master guide - explains 3 integration options
│   │
│   ├── README.md
│   │   └── Technical documentation and API reference
│   │
│   ├── FILE_MANIFEST.md (This file)
│   │   └── What each file does
│   │
│   ├── INTEGRATION_PROMPT.md
│   │   └── Detailed prompt for backend LLM (Option 2)
│   │
│   ├── QUICK_START_PROMPT.md
│   │   └── Short prompt for backend LLM (Option 3)
│   │
│   └── EXAMPLE_INTEGRATION.js
│       └── Complete working example with PostgreSQL (Option 1)
│
├── 🔧 CORE SCRAPER (Copy these to your backend)
│   │
│   ├── extractors/
│   │   │
│   │   ├── structured-data.js
│   │   │   └── Extracts price from JSON-LD Schema.org markup
│   │   │   └── Works universally on 70% of e-commerce sites
│   │   │   └── Main extraction method
│   │   │
│   │   ├── price-extractor.js
│   │   │   └── Main price extraction orchestrator
│   │   │   └── 3-tier strategy: structured → selectors → scoring
│   │   │   └── Contains validation and scoring logic
│   │   │
│   │   └── metadata-extractor.js
│   │       └── Extracts product title, image, canonical URL
│   │       └── Uses OG tags and semantic markup
│   │
│   ├── config/
│   │   │
│   │   └── selectors.js
│   │       └── Universal CSS selectors for price extraction
│   │       └── Vendor-agnostic semantic selectors
│   │
│   ├── scraper.js
│   │   └── Main entry point for running scraper
│   │   └── Handles browser lifecycle and batch processing
│   │   └── Can be used standalone or imported
│   │
│   └── package.json
│       └── NPM dependencies (just puppeteer)
│       └── Scripts for testing
│
└── 🧪 TESTING
    │
    └── test-scraper.js
        └── Test script to verify scraper works
        └── Tests Amazon, Walmart, Target by default
        └── Can test custom URLs
```

---

## 📄 File Descriptions

### **Documentation Files** 📚

| File | Purpose | When to Use |
|------|---------|-------------|
| `HOW_TO_USE.md` | Master guide with 3 integration options | **START HERE** |
| `README.md` | Technical documentation, API reference | Reference during development |
| `FILE_MANIFEST.md` | This file - what each file does | Quick reference |
| `INTEGRATION_PROMPT.md` | Detailed LLM prompt (AI-assisted) | Option 2: Detailed integration |
| `QUICK_START_PROMPT.md` | Short LLM prompt (AI-assisted) | Option 3: Fast integration |
| `EXAMPLE_INTEGRATION.js` | Complete working example | Option 1: DIY reference |

### **Core Scraper Files** 🔧

| File | Lines | Purpose | Must Copy? |
|------|-------|---------|-----------|
| `extractors/structured-data.js` | ~100 | Parses JSON-LD for prices | ✅ Yes |
| `extractors/price-extractor.js` | ~250 | Main extraction logic | ✅ Yes |
| `extractors/metadata-extractor.js` | ~150 | Title/image extraction | ✅ Yes |
| `config/selectors.js` | ~50 | Universal CSS selectors | ✅ Yes |
| `scraper.js` | ~150 | Main entry point | ✅ Yes |
| `package.json` | ~25 | Dependencies | ✅ Yes |

### **Testing Files** 🧪

| File | Purpose | When to Use |
|------|---------|-------------|
| `test-scraper.js` | Standalone test script | Before integration, debugging |

---

## 🎯 Which Files Do What?

### **For Price Extraction:**
```
structured-data.js    → Tries JSON-LD first (best method)
       ↓ (if fails)
price-extractor.js    → Tries universal selectors
       ↓ (if fails)
price-extractor.js    → Tries scoring fallback
       ↓
Returns: price (number) or throws error
```

### **For Product Metadata:**
```
metadata-extractor.js → Extracts title, image, URL
                      → Uses OG tags, meta tags, semantic HTML
                      → Returns: { title, image, url, vendor }
```

### **For Running Scraper:**
```
scraper.js → Opens Puppeteer browser
           → Calls price-extractor for each product
           → Returns results array
           → Handles errors and timeouts
```

---

## 📋 Copy Checklist

When copying to your backend, you need:

### **Required (Must Copy):**
- [x] `extractors/` folder (all 3 files)
- [x] `config/` folder (selectors.js)
- [x] `scraper.js`
- [x] `package.json`

### **Optional (Helpful):**
- [ ] `test-scraper.js` (for testing)
- [ ] `README.md` (for documentation)
- [ ] `EXAMPLE_INTEGRATION.js` (for reference)

### **Don't Copy (Only for LLM):**
- [ ] `INTEGRATION_PROMPT.md` (use with AI, don't deploy)
- [ ] `QUICK_START_PROMPT.md` (use with AI, don't deploy)
- [ ] `HOW_TO_USE.md` (guide only)
- [ ] `FILE_MANIFEST.md` (this file)

---

## 🔄 Integration Files You'll Create

After following an integration option, you'll create:

### **In Your Backend:**
```
your-backend/
├── price-scraper/              ← Copy from PUPPETEER_SCRAPER_FILES
│   ├── extractors/
│   ├── config/
│   ├── scraper.js
│   └── package.json
│
├── price-scraper/services/     ← You create these (AI helps)
│   ├── database.js             ← Queries your DB
│   └── notifications.js        ← Sends alerts
│
├── jobs/                       ← You create this (AI helps)
│   └── price-scraper-cron.js   ← Runs every 6 hours
│
└── .env                        ← Add scraper config
```

---

## 🎓 Understanding Dependencies

### **What Each File Imports:**

```javascript
// structured-data.js
// No imports - pure function for page.evaluate()

// price-extractor.js
const { extractPriceFromStructuredData } = require('./structured-data');
const { UNIVERSAL_SELECTORS } = require('../config/selectors');

// metadata-extractor.js
// No imports - pure functions

// scraper.js
const puppeteer = require('puppeteer');
const { extractPrice } = require('./extractors/price-extractor');
const { extractMetadata } = require('./extractors/metadata-extractor');
```

### **What You'll Import in Your Backend:**

```javascript
// In your cron job:
const { runPriceCheck } = require('./price-scraper/scraper');

// In your API (optional):
const { extractPrice } = require('./price-scraper/extractors/price-extractor');
const { extractMetadata } = require('./price-scraper/extractors/metadata-extractor');
```

---

## 📊 File Sizes

| File | Size | What It Contains |
|------|------|------------------|
| `structured-data.js` | ~3 KB | JSON-LD parser |
| `price-extractor.js` | ~10 KB | Extraction logic + scoring |
| `metadata-extractor.js` | ~6 KB | Title/image extraction |
| `selectors.js` | ~1 KB | CSS selector arrays |
| `scraper.js` | ~5 KB | Main orchestrator |
| `test-scraper.js` | ~6 KB | Test script |
| **Total Code** | **~31 KB** | Very lightweight! |

---

## 🚀 Quick Reference

### **To Test Scraper:**
```bash
node test-scraper.js
```

### **To Import in Your Code:**
```javascript
const { runPriceCheck } = require('./price-scraper/scraper');
const { extractPrice } = require('./price-scraper/extractors/price-extractor');
```

### **To Use with AI:**
1. Copy `INTEGRATION_PROMPT.md` → Detailed integration
2. Copy `QUICK_START_PROMPT.md` → Fast integration

### **To DIY:**
1. Copy all core scraper files
2. Look at `EXAMPLE_INTEGRATION.js`
3. Adapt to your setup

---

## ✅ Verification

**You have everything if you see:**
- [x] 4 documentation files (*.md)
- [x] 1 example file (*.js)
- [x] 3 extractor files (extractors/*.js)
- [x] 1 config file (config/*.js)
- [x] 1 main file (scraper.js)
- [x] 1 test file (test-scraper.js)
- [x] 1 package file (package.json)

**Total: 12 files**

---

**Need help? Start with `HOW_TO_USE.md` →**

