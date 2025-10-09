# 🚀 Quick Install Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Add to your `.env` file:

```bash
# Database (you already have these)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealpop
DB_USER=postgres
DB_PASSWORD=your_password

# SendGrid (for email alerts)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Redis (for BullMQ - optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio (for SMS - optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Test the Scraper

```bash
# Test with a single product
npm run scraper:test "https://www.amazon.com/dp/B0CX23V2ZK"
```

You should see:
```
✅ SUCCESS: Extracted price from structured data: $299.99
```

### Step 4: Run First Scrape

```bash
# This will scrape all products in your database
npm run scraper:cron
```

### Step 5: Schedule Cron Job

Add to your system crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs every 6 hours)
0 */6 * * * cd /path/to/puppeteer-scraper && npm run scraper:cron >> logs/scraper.log 2>&1
```

---

## ✅ That's It!

Your scraper is now:
- ✅ Checking prices every 6 hours
- ✅ Updating your database
- ✅ Sending email alerts on price drops
- ✅ Logging price history

---

## 🔧 Optional: Use BullMQ Instead

For better scalability, use the job queue:

**Terminal 1 - Worker (keep running):**
```bash
npm run jobs:worker
```

**Terminal 2 - Schedule jobs:**
```bash
npm run jobs:schedule
```

Or use PM2 to keep it running:
```bash
npm install -g pm2
pm2 start jobs/worker.js --name scraper-worker
pm2 save
```

---

## 📊 Check Results

View price history:
```sql
SELECT * FROM price_history ORDER BY recorded_at DESC LIMIT 10;
```

View notification logs:
```sql
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🐛 Troubleshooting

**Chrome not found:**
```bash
# macOS
brew install chromium

# Linux
sudo apt-get install chromium-browser
```

**Redis connection error:**
```bash
# Start Redis
brew services start redis  # macOS
sudo service redis-server start  # Linux
```

**Email not sending:**
- Check SendGrid API key in `.env`
- Verify sender email in SendGrid dashboard
- Check `notification_logs` table for errors

---

## 📞 Need Help?

Read the full documentation: `INTEGRATION_COMPLETE.md`

