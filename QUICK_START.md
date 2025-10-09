# ⚡ Quick Start - Get Running in 5 Minutes

## Step 1: Configure Database

Create or update your `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealpop           # ← Your database name
DB_USER=postgres          # ← Your database user
DB_PASSWORD=your_password # ← Your database password
DB_SSL=false

# Email Notifications (required)
SENDGRID_API_KEY=your_sendgrid_key_here

# SMS Notifications (optional - skip for now)
# TWILIO_ACCOUNT_SID=xxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_PHONE_NUMBER=+1234567890
```

## Step 2: Initialize Database (if needed)

If you don't have the tables yet:

```bash
node -e "import('./db.js').then(m => m.createTables())"
```

Seed with test data:

```bash
node -e "import('./db.js').then(m => m.seed())"
```

## Step 3: Test Database Connection

```bash
node test-cron-dry-run.js
```

You should see:
```
✅ Connected! Found 8 tracked products
```

## Step 4: Test the Cron Job

```bash
npm run scraper:cron
```

This will:
- ✅ Fetch products from database
- ✅ Scrape current prices
- ✅ Update database
- ✅ Send email alerts

## Step 5: Schedule the Cron Job

### Option A: System Cron

```bash
crontab -e
```

Add this line (runs every 6 hours):
```
0 */6 * * * cd /Users/quinton/Desktop/srccode/deal-pop/puppeteer-scraper && npm run scraper:cron >> logs/scraper.log 2>&1
```

### Option B: PM2 (Recommended)

```bash
npm install -g pm2

# Create daemon
cat > cron-daemon.js << 'EOF'
import cron from 'node-cron';
import { exec } from 'child_process';

cron.schedule('0 */6 * * *', () => {
  console.log('⏰ Running price check...');
  exec('npm run scraper:cron', (error, stdout) => {
    console.log(stdout);
    if (error) console.error(error);
  });
});

console.log('✅ Cron daemon started');
EOF

# Start with PM2
pm2 start cron-daemon.js --name price-scraper
pm2 save
pm2 startup
```

## ✅ Done!

Your scraper is now:
- ✅ Running every 6 hours
- ✅ Checking all tracked products
- ✅ Updating prices in database
- ✅ Sending email alerts

---

## 🔍 Troubleshooting

### "Database does not exist"

Create the database:
```bash
psql -U postgres
CREATE DATABASE dealpop;
\q
```

Then run tables setup:
```bash
node -e "import('./db.js').then(m => m.createTables())"
```

### "No products found"

Seed test data:
```bash
node -e "import('./db.js').then(m => m.seed())"
```

### "SendGrid error"

1. Get API key: https://app.sendgrid.com/settings/api_keys
2. Add to `.env`: `SENDGRID_API_KEY=SG.xxx...`
3. Verify sender email in SendGrid

### "Chrome not found"

```bash
# macOS
brew install chromium

# Linux
sudo apt-get install chromium-browser
```

---

## 📊 Verify It's Working

Check database:
```sql
-- Recent price updates
SELECT * FROM price_history 
ORDER BY recorded_at DESC 
LIMIT 5;

-- Sent notifications
SELECT * FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

Check logs:
```bash
tail -f logs/scraper.log
```

---

## 📖 More Documentation

- **SETUP_CRON.md** - Detailed cron setup
- **INTEGRATION_COMPLETE.md** - Full documentation
- **README.md** - Project overview

