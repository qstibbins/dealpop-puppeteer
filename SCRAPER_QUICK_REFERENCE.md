# Puppeteer Scraper - Quick Reference
**Component:** Price Scraper & Cron Job System  
**Target Testing:** October 17, 2025 (8 days)  
**Target Launch:** October 21, 2025 (12 days)

---

## 🎯 Current Status

**Overall Completion: 85%**

| Component | Status | What Works | What Needs Work |
|-----------|--------|------------|-----------------|
| Core Scraper | ✅ 95% | 3-tier extraction, multi-site support | Testing at scale |
| Database | ✅ 90% | Schema complete, operations work | Production DB setup |
| Cron Job | ✅ 85% | Basic implementation works | Production scheduling |
| Notifications | ✅ 80% | Email & SMS configured | Delivery testing |
| Deployment | ⚠️ 30% | Configs exist | Not deployed yet |
| Monitoring | ⚠️ 20% | Basic logging | Need full monitoring |

**Bottom Line:** Scraper is mostly done. Needs testing, deployment, and monitoring.

---

## ⚡ 3 Critical Actions (Do First)

### 1. Test with Real Products (TODAY - Oct 9-10)
**Why:** Claimed 98% success rate needs validation  
**How:** Create list of 50+ products, run scraper, measure success rate  
**Time:** 6 hours  
**Files:** Create `test-products.json` or use `price-scraper/test.js`

### 2. Choose Deployment Platform (Oct 12)
**Why:** Need to know where to deploy  
**Recommendation:** Railway (easiest, $5-20/month)  
**Alternative:** Render (similar, has free tier)  
**Time:** 2 hours to research and set up account

### 3. Deploy to Production (Oct 13)
**Why:** Need scraper running automatically  
**How:** Follow deployment guide for chosen platform  
**Time:** 5 hours for initial deployment  
**Result:** Cron job running every 6 hours

---

## 📅 5-Day Plan to Production Ready

### Day 1: Oct 9-10 (Testing)
- [ ] S-001: Create test product dataset (50+ URLs)
- [ ] S-002: Run comprehensive tests
- [ ] Document success rate and failures

**Goal:** Know what works and what doesn't

---

### Day 2: Oct 11 (Bug Fixes)
- [ ] S-003: Fix critical extraction issues
- [ ] S-004: Test alert triggering
- [ ] S-005: Test email/SMS notifications

**Goal:** Fix all blockers, alerts working

---

### Day 3: Oct 12 (Deployment Prep)
- [ ] S-006: Choose deployment platform
- [ ] S-007: Configure environment variables
- [ ] S-008: Set up production database

**Goal:** Ready to deploy

---

### Day 4: Oct 13 (Deploy)
- [ ] S-009: Deploy scraper to production
- [ ] S-010: Configure cron job (every 6 hours)
- [ ] S-011: Production smoke testing

**Goal:** Scraper running in production

---

### Day 5: Oct 14-15 (Monitor & Polish)
- [ ] S-012: Set up error tracking (Sentry)
- [ ] S-013: Create health check endpoint
- [ ] S-014: Set up uptime monitoring
- [ ] S-016: Optimize Puppeteer
- [ ] S-017: Implement browser reuse
- [ ] S-019: Update documentation

**Goal:** Production-ready with monitoring

---

## 📊 Task Summary

| Priority | Count | Total Hours | Must Complete By |
|----------|-------|-------------|------------------|
| P0 - Critical | 11 tasks | 28-35 hours | Oct 13 |
| P1 - High | 6 tasks | 11 hours | Oct 15 |
| P2 - Medium | 3 tasks | 7 hours | Optional |
| P3 - Low | 1 task | 1 hour | Optional |

**Total:** 21 tasks, 47-54 hours

**With 1 developer:** 5-7 working days  
**Timeline:** Oct 9-15 (achievable)

---

## 🔴 Top 5 Risks & Mitigations

### 1. Success Rate Below 80%
**Risk:** Scraper doesn't work on enough sites  
**Mitigation:** Test early (Day 1), fix issues immediately  
**Fallback:** Focus on top 5 sites (Amazon, Walmart, Target, etc.)

### 2. Puppeteer Crashes in Production
**Risk:** Browser instability, memory leaks  
**Mitigation:** Proper error handling, browser reuse, monitoring  
**Fallback:** Restart logic, alerts on failures

### 3. IP Blocking
**Risk:** Sites block scraper for too many requests  
**Mitigation:** Rate limiting, start with small product set  
**Fallback:** User agent rotation, residential proxies (post-MVP)

### 4. Deployment Issues
**Risk:** Chromium won't run on chosen platform  
**Mitigation:** Choose platform with Puppeteer support (Railway/Render)  
**Fallback:** Have backup platform ready (VPS)

### 5. Database Schema Conflicts
**Risk:** Scraper DB schema differs from backend  
**Mitigation:** Coordinate with backend team early  
**Fallback:** Use scraper's DB for now, merge later

---

## 🚀 Deployment Quick Guide

### Recommended: Railway

**Pros:**
- Easy GitHub integration
- Built-in PostgreSQL
- Built-in cron jobs
- Good documentation
- $5-20/month

**Setup Steps:**
1. Create Railway account
2. New project from GitHub
3. Add PostgreSQL plugin
4. Set environment variables
5. Add Puppeteer buildpack: `nixpacks.build`
6. Deploy
7. Configure cron: `0 */6 * * *` → `npm run scraper:cron`

**Time:** 2-3 hours

---

### Alternative: Render

**Pros:**
- Native Puppeteer support
- Free tier available
- Built-in cron jobs

**Cons:**
- Free tier has cold starts

**Setup Steps:**
1. Create Render account
2. New Web Service from GitHub
3. Add PostgreSQL database
4. Set environment variables
5. Add Cron Job: `0 */6 * * *` → `npm run scraper:cron`

**Time:** 2-3 hours

---

## 📝 Required Environment Variables

### Production .env:
```bash
# Database (production)
DB_HOST=your-production-db.railway.app
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true

# Email Notifications (required)
SENDGRID_API_KEY=SG.your-key-here

# SMS Notifications (optional for MVP)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis (only if using BullMQ)
REDIS_HOST=your-redis.railway.app
REDIS_PORT=6379

# Node Environment
NODE_ENV=production
```

---

## 🧪 Testing Checklist

### Before Deployment:
- [ ] Test with 50+ real product URLs
- [ ] Success rate > 80%
- [ ] Alerts trigger correctly
- [ ] Emails send successfully
- [ ] SMS works (if configured)
- [ ] Database updates properly
- [ ] Price history records
- [ ] No memory leaks
- [ ] Logs are readable

### After Deployment:
- [ ] Cron job executes
- [ ] Products scrape successfully
- [ ] Database updates in production
- [ ] Alerts trigger
- [ ] Notifications send
- [ ] Health check returns 200
- [ ] Error tracking works
- [ ] No critical errors

---

## 🔍 Monitoring Setup

### Must Have (P1):
1. **Error Tracking** (Sentry)
   - Catch all errors
   - Alert on critical issues
   - Free tier: 5,000 events/month

2. **Uptime Monitoring** (UptimeRobot)
   - Monitor health endpoint
   - Check every 5 minutes
   - Free tier: 50 monitors

3. **Health Check Endpoint**
   - Returns scraper status
   - Last run time
   - Success/failure counts

### Nice to Have (P2):
1. **Log Aggregation** (Papertrail)
   - Centralized logs
   - Searchable
   - 7-day retention

2. **Performance Monitoring**
   - Scrape duration
   - Memory usage
   - Success rate trends

---

## 📁 File Structure

```
puppeteer-scraper/
├── price-scraper/           # Core scraper
│   ├── scraper.js          # Main scraper entry
│   ├── extractors/         # Price extraction logic
│   ├── services/           # Database operations
│   └── config/             # Selectors config
├── cron/
│   └── scrapePrices.js     # Cron job (runs every 6 hours)
├── jobs/                    # BullMQ (optional)
│   ├── scheduler.js
│   └── worker.js
├── utils/
│   ├── notifyUser.js       # Email notifications
│   └── notifySMS.js        # SMS notifications
├── db.js                    # Database schema & connection
├── package.json
└── .env                     # Environment variables
```

---

## 🎯 Success Criteria

### By Oct 13 (Deploy Deadline):
- [ ] Tested with 50+ real products
- [ ] Success rate documented and > 80%
- [ ] All critical bugs fixed
- [ ] Deployed to production
- [ ] Cron job running every 6 hours
- [ ] Alerts triggering correctly
- [ ] Email notifications working
- [ ] No critical errors

### By Oct 17 (Testing Deadline):
- [ ] All P0 and P1 tasks complete
- [ ] Error tracking active
- [ ] Uptime monitoring configured
- [ ] Health check endpoint working
- [ ] Documentation updated
- [ ] Production stable

### By Oct 21 (Launch):
- [ ] Running smoothly
- [ ] Processing real user products
- [ ] Sending real alerts
- [ ] Monitoring dashboards green
- [ ] Team trained on operations

---

## 💡 Quick Commands

### Local Development:
```bash
# Install dependencies
npm install

# Test scraper with sample products
npm run scraper:test

# Test single product URL
npm run scraper:single "https://www.amazon.com/dp/B0CX23V2ZK"

# Run cron job once
npm run scraper:cron

# Start BullMQ worker (optional)
npm run jobs:worker

# Schedule jobs (optional)
npm run jobs:schedule
```

### Database:
```bash
# Create tables
node -e "import('./db.js').then(m => m.createTables())"

# Seed test data
node -e "import('./db.js').then(m => m.seed())"
```

### Testing:
```bash
# Test email notifications
node test-email-notifications.js

# Check alerts
node check-alerts.js

# Show products
node show-products.js

# Show database updates
node show-db-updates.js
```

---

## 🆘 Troubleshooting

### Chrome/Chromium Not Found:
```bash
# macOS
brew install chromium

# Linux
sudo apt-get install chromium-browser

# Or let Puppeteer download it
npx puppeteer browsers install chrome
```

### Database Connection Error:
- Check DB credentials in `.env`
- Verify database is running
- Check DB_SSL setting (true for production, false for local)
- Test connection: `psql -h DB_HOST -U DB_USER -d DB_NAME`

### Scraper Extraction Failed:
- Take screenshot: `await page.screenshot({ path: 'debug.png' })`
- Check HTML: `const html = await page.content()`
- Verify site didn't change layout
- Check if site is blocking bots
- Try different user agent

### Cron Job Not Running:
- Check platform cron configuration
- Verify cron schedule syntax: `0 */6 * * *`
- Check logs for errors
- Test manual run: `npm run scraper:cron`

### Email Not Sending:
- Verify SendGrid API key
- Check sender email is verified in SendGrid
- Check spam folder
- Review notification_logs table
- Test SendGrid API directly

---

## 📚 Documentation Files

**In this directory:**
- `SCRAPER_MVP_GAP_ANALYSIS.md` - Full analysis (read first)
- `SCRAPER_TASK_LIST.csv` - All tasks for project management
- `SCRAPER_QUICK_REFERENCE.md` - This file
- `README.md` - General overview
- `INTEGRATION_COMPLETE.md` - Integration documentation
- `QUICK_START.md` - 5-minute setup guide
- `SETUP_CRON.md` - Cron job setup
- `CRON_READY.md` - Cron readiness checklist

---

## ✅ Daily Checklist

### Each Morning:
- [ ] Check if cron job ran overnight
- [ ] Review logs for errors
- [ ] Check success rate
- [ ] Verify notifications sent
- [ ] Check monitoring dashboards

### Each Evening:
- [ ] Complete assigned tasks
- [ ] Update task status
- [ ] Document any blockers
- [ ] Commit and push code
- [ ] Update team on progress

---

## 🎯 Focus Areas by Day

| Day | Focus | Key Deliverable |
|-----|-------|-----------------|
| Oct 9-10 | Testing | Success rate documented |
| Oct 11 | Bug Fixing | No critical bugs |
| Oct 12 | Deployment Prep | Environment ready |
| Oct 13 | Deploy | Scraper in production |
| Oct 14-15 | Monitor | Monitoring active |

---

## 🚦 Go/No-Go Criteria

### Ready to Deploy (Oct 13):
- ✅ Success rate > 80% on test dataset
- ✅ No P0 bugs
- ✅ Alerts trigger correctly
- ✅ Notifications send
- ✅ Database operations work
- ✅ Environment variables configured

### Ready to Launch (Oct 21):
- ✅ Deployed and stable
- ✅ Cron running automatically
- ✅ Monitoring active
- ✅ Error tracking configured
- ✅ Documentation complete
- ✅ Team trained

---

## 💼 Resource Needs

**Team:** 1 Backend Developer (full-time, 5-7 days)

**Infrastructure:**
- Hosting: $20-50/month (Railway/Render)
- Database: $10-30/month (PostgreSQL)
- Monitoring: $0-20/month (free tiers sufficient)

**Total:** $30-100/month

---

## 🎉 You're Ready!

The scraper component is in great shape. Focus on these priorities:

1. **Test early** (Day 1) - Validate success rate
2. **Deploy fast** (Day 4) - Get to production quickly
3. **Monitor closely** (Day 5+) - Catch issues early

**With focused work, this can be production-ready by Oct 13.**

Start with S-001 (Create test dataset) NOW! 🚀

---

*Last Updated: October 9, 2025*

