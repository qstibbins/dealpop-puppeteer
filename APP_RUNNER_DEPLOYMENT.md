# Price Scraper App Runner Deployment

## 🚀 **Files Created:**

### **1. `server.js`** - Main server with cron scheduling
- Runs scraper every 5 minutes using `node-cron`
- Health check endpoint: `GET /health`
- Manual trigger endpoint: `POST /trigger`
- Runs scraper once on startup

### **2. `apprunner.yaml`** - App Runner configuration
- Node.js 18 runtime
- Port 3000
- Environment variables for database and API keys

### **3. Updated `package.json`**
- Added `express` and `node-cron` dependencies

## 📋 **Deployment Steps:**

### **1. Install Dependencies:**
```bash
npm install
```

### **2. Deploy to App Runner:**
- Connect your GitHub repo to App Runner
- App Runner will automatically detect `apprunner.yaml`
- Set environment variables in App Runner console

### **3. Environment Variables to Set:**
```
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=your-verified-email
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

## 🧪 **Testing:**

### **Health Check:**
```bash
curl https://your-app-runner-url.amazonaws.com/health
```

### **Manual Trigger:**
```bash
curl -X POST https://your-app-runner-url.amazonaws.com/trigger
```

### **Check Logs:**
```bash
aws logs tail /aws/apprunner/your-service-name --follow
```

## ⏰ **Scheduling:**
- **Automatic:** Runs every 5 minutes
- **Manual:** POST to `/trigger` endpoint
- **Startup:** Runs once when App Runner starts

## 💰 **Cost:**
- Same as your current App Runner
- Runs continuously (like your main backend)
- No additional scheduling costs

## 🎯 **What Happens:**
1. App Runner starts your server
2. Server runs scraper once on startup
3. Cron job runs scraper every 5 minutes
4. Scraper checks prices and sends emails
5. Health check keeps App Runner alive

**That's it!** Deploy and it works automatically.
