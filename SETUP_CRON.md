# ⚡ Cron Job Setup (Simple Approach)

**Perfect for MVP - No Redis/BullMQ needed!**

---

## 📦 What You Need

### 1. Dependencies

```bash
npm install
```

This installs:
- ✅ `puppeteer` - Browser automation
- ✅ `pg` - PostgreSQL client
- ✅ `@sendgrid/mail` - Email notifications
- ✅ `dotenv` - Environment variables

**You DON'T need:**
- ❌ Redis
- ❌ BullMQ
- ❌ Twilio (optional for SMS)

### 2. Environment Variables

Add to your existing `.env`:

```bash
# You already have these
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealpop
DB_USER=postgres
DB_PASSWORD=your_password

# Add this for email notifications
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Optional - SMS notifications
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🧪 Test Before Scheduling

### Test 1: Single Product URL

```bash
npm run scraper:single "https://www.amazon.com/dp/B0CX23V2ZK"
```

Expected output:
```
🚀 Starting price check for 1 products...
✅ SUCCESS: Extracted price from structured data: $299.99
```

### Test 2: All Database Products

```bash
npm run scraper:cron
```

This will:
1. ✅ Fetch all tracked products from your database
2. ✅ Scrape current prices
3. ✅ Update database with new prices
4. ✅ Send email/SMS alerts if prices dropped

Expected output:
```
📦 Found 8 products to check

🛍️  Scraping: Kitchen Mixer
✅ SUCCESS: $299.99
🎉 PRICE ALERT: Target price reached!
📧 Sent email notification to user@example.com

📊 SUMMARY
Total products: 8
Successful: 7
Failed: 1
Price alerts: 2
```

---

## 📅 Schedule the Cron Job

### Option 1: System Crontab (Production)

```bash
# Open crontab editor
crontab -e
```

Add this line (runs every 6 hours):
```bash
0 */6 * * * cd /Users/quinton/Desktop/srccode/deal-pop/puppeteer-scraper && npm run scraper:cron >> logs/scraper.log 2>&1
```

**Cron schedule examples:**
```bash
0 */6 * * *     # Every 6 hours
0 0 * * *       # Daily at midnight
0 */4 * * *     # Every 4 hours
0 9,21 * * *    # Twice daily (9am and 9pm)
*/30 * * * *    # Every 30 minutes (testing)
```

### Option 2: PM2 Process Manager (Recommended)

If you want better monitoring and auto-restart:

```bash
# Install PM2
npm install -g pm2

# Create a simple daemon script
cat > cron-daemon.js << 'EOF'
import cron from 'node-cron';
import { exec } from 'child_process';

// Run every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('⏰ Running scheduled price check...');
  exec('npm run scraper:cron', (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log(stdout);
    }
  });
});

console.log('✅ Cron daemon started. Running every 6 hours.');
EOF

# Start with PM2
pm2 start cron-daemon.js --name price-scraper
pm2 save
pm2 startup
```

View logs:
```bash
pm2 logs price-scraper
pm2 status
```

---

## 📊 What Gets Updated

When the cron job runs, it updates these tables:

```sql
-- Updates current price
UPDATE tracked_products 
SET current_price = 299.99, updated_at = NOW()
WHERE id = 123;

-- Records price history
INSERT INTO price_history (product_id, price, in_stock, recorded_at)
VALUES (123, 299.99, true, NOW());

-- Marks alerts as triggered
UPDATE alerts 
SET status = 'triggered', triggered_at = NOW()
WHERE product_id = 123 AND current_price <= target_price;

-- Logs notifications
INSERT INTO notification_logs 
(user_id, alert_id, notification_type, channel, status, sent_at)
VALUES ('user123', 456, 'price_drop_alert', 'email', 'sent', NOW());
```

---

## 🔍 Monitor Your Cron Job

### View Logs

```bash
# If using system cron
tail -f logs/scraper.log

# If using PM2
pm2 logs price-scraper
```

### Check Database

```sql
-- Recent price updates
SELECT 
  tp.product_name,
  ph.price,
  ph.recorded_at
FROM price_history ph
JOIN tracked_products tp ON ph.product_id = tp.id
ORDER BY ph.recorded_at DESC
LIMIT 10;

-- Sent notifications
SELECT 
  nl.created_at,
  nl.channel,
  nl.status,
  a.product_name
FROM notification_logs nl
JOIN alerts a ON nl.alert_id = a.id
ORDER BY nl.created_at DESC
LIMIT 10;
```

### Test Notifications

Manually trigger a test:

```javascript
// test-notification.js
import { notifyUser } from './utils/notifyUser.js';

await notifyUser(
  'your-email@example.com',
  'Test Product',
  99.99,
  'https://example.com/product'
);

console.log('✅ Test email sent!');
```

Run:
```bash
node test-notification.js
```

---

## ⚙️ Files You're Using

For the cron job approach, you only use these files:

```
✅ USING:
price-scraper/                 # Scraper logic
├── extractors/               # Price extraction
├── services/database.js      # Database operations
└── scraper.js                # Main scraper

cron/scrapePrices.js          # ⭐ Main cron job file
utils/notifyUser.js           # Email notifications
utils/notifySMS.js            # SMS notifications (optional)
db.js                         # Database connection

❌ NOT USING (for later):
jobs/scheduler.js             # BullMQ scheduler
jobs/worker.js                # BullMQ worker
```

---

## 🎯 Cron Job Flow

```
┌─────────────────────────┐
│   Cron Triggers         │
│   (every 6 hours)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  npm run scraper:cron   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ cron/scrapePrices.js    │
│ - getTrackedProducts()  │
│ - runPriceCheck()       │
│ - updateProductPrice()  │
│ - getActiveAlerts()     │
│ - notifyUser()          │
│ - markAlertTriggered()  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Results Logged        │
│   Users Notified        │
│   Database Updated      │
└─────────────────────────┘
```

---

## ⚠️ Troubleshooting

### "Chrome not found"

```bash
# macOS
brew install chromium

# Linux
sudo apt-get install chromium-browser

# Verify
which chromium
```

### "SendGrid API key invalid"

1. Get API key: https://app.sendgrid.com/settings/api_keys
2. Update `.env`:
   ```
   SENDGRID_API_KEY=SG.xxx...
   ```
3. Verify sender email in SendGrid dashboard

### "No products found"

Check your database:
```sql
SELECT * FROM tracked_products 
WHERE status = 'tracking' 
AND expires_at > NOW();
```

If empty, seed test data:
```bash
node -e "import('./db.js').then(m => m.seed())"
```

### Cron job not running

Check if cron is working:
```bash
# View your crontab
crontab -l

# Check cron logs (macOS)
tail -f /var/log/system.log | grep cron

# Check cron logs (Linux)
grep CRON /var/log/syslog
```

---

## ✅ Checklist

Before going to production:

- [ ] `npm install` completed successfully
- [ ] `.env` configured with `SENDGRID_API_KEY`
- [ ] `npm run scraper:cron` works locally
- [ ] Email notifications sent successfully
- [ ] Database updated with test prices
- [ ] Crontab scheduled (or PM2 running)
- [ ] Logs directory created: `mkdir -p logs`
- [ ] Verified Chrome/Chromium installed

---

## 🚀 You're Ready!

Your cron job setup is complete. The scraper will:

✅ Run every 6 hours (or your schedule)
✅ Check all tracked products
✅ Update database automatically
✅ Send notifications on price drops
✅ Log all activity

**No manual intervention needed!**

---

## 📈 Next Steps

After MVP launch, you can:

1. Add SMS notifications (Twilio)
2. Switch to BullMQ for better scalability
3. Add webhook notifications
4. Implement proxy rotation
5. Add admin dashboard

But for now, you're **production-ready**! 🎉

