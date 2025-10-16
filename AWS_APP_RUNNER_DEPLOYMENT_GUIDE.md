# AWS App Runner Deployment Guide for DealPop Price Scraper

## Overview
This guide will walk you through deploying your DealPop Price Scraper to AWS App Runner with a cron job that runs every 10 minutes and provides detailed logging.

## Prerequisites
- AWS CLI configured with appropriate permissions
- GitHub repository with your code
- Database credentials (PostgreSQL)
- SendGrid API key
- Twilio credentials (optional)

## Step 1: Prepare Your Repository

### 1.1 Commit Your Changes
```bash
# Add all files to git
git add .

# Commit the changes
git commit -m "Prepare for AWS App Runner deployment with enhanced logging"

# Push to your repository
git push origin main
```

### 1.2 Verify Required Files
Ensure these files are in your repository root:
- `Dockerfile` ✅
- `apprunner.yaml` ✅
- `package.json` ✅
- `server.js` ✅
- All other application files

## Step 2: Create AWS App Runner Service

### 2.1 Access AWS App Runner Console
1. Log into AWS Console
2. Navigate to **App Runner** service
3. Click **"Create an App Runner service"**

### 2.2 Configure Source
1. **Source**: Choose "Source code repository"
2. **Repository type**: GitHub
3. **Connect to GitHub**: 
   - Click "Add new"
   - Authorize AWS App Runner to access your GitHub
   - Select your repository: `deal-pop/puppeteer-scraper`
   - Branch: `main`
4. **Deployment trigger**: Automatic (deploys on every push)

### 2.3 Configure Build Settings
1. **Configuration file**: Use a configuration file
2. **App Runner configuration file**: `apprunner.yaml`

### 2.4 Configure Service Settings
1. **Service name**: `dealpop-price-scraper`
2. **Virtual CPU**: 1 vCPU
3. **Virtual memory**: 2 GB
4. **Environment variables** (Add these one by one):

```
NODE_ENV = production
PORT = 3000
DB_HOST = your-database-host.amazonaws.com
DB_PORT = 5432
DB_NAME = your-database-name
DB_USER = your-database-username
DB_PASSWORD = your-database-password
DB_SSL = true
SENDGRID_API_KEY = your-sendgrid-api-key
SENDGRID_FROM_EMAIL = your-sendgrid-from-email@yourdomain.com
TWILIO_ACCOUNT_SID = your-twilio-account-sid
TWILIO_AUTH_TOKEN = your-twilio-auth-token
```

### 2.5 Configure Auto Scaling
1. **Min size**: 1
2. **Max size**: 3
3. **Concurrency**: 10

### 2.6 Configure Health Check
1. **Health check path**: `/health`
2. **Health check interval**: 20 seconds
3. **Health check timeout**: 2 seconds
4. **Healthy threshold**: 1
5. **Unhealthy threshold**: 5

### 2.7 Review and Create
1. Review all settings
2. Click **"Create & deploy"**

## Step 3: Monitor Deployment

### 3.1 Watch Build Process
- The build will take 5-10 minutes
- Monitor the **Logs** tab for build progress
- Look for successful Docker build messages

### 3.2 Verify Service Health
Once deployed, your service will be available at:
`https://your-service-name.region.awsapprunner.com`

Test the health endpoint:
```bash
curl https://your-service-name.region.awsapprunner.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "service": "price-scraper"
}
```

## Step 4: Monitor Cron Job Execution

### 4.1 View Application Logs
1. In App Runner console, go to your service
2. Click **"Logs"** tab
3. You'll see logs every 10 minutes when the cron job runs

### 4.2 Expected Log Output
Every 10 minutes, you should see logs like:

```
⏰ Cron trigger: Starting scheduled scraper job

🕐 Starting scheduled price check...
⏰ 2024-01-XX...

📦 Found 5 products to check
👥 Processing products for 2 users:
   📧 user1@example.com (user-id-1): 3 products
      • Product Name 1 (Amazon) - Current: $29.99, Target: $25.00
      • Product Name 2 (Best Buy) - Current: $199.99, Target: $180.00
      • Product Name 3 (Target) - Current: $15.99, Target: $12.00
   📧 user2@example.com (user-id-2): 2 products
      • Product Name 4 (Walmart) - Current: $45.99, Target: $40.00
      • Product Name 5 (Amazon) - Current: $89.99, Target: $75.00

📝 Updating database...

✅ Updated product 123: $28.50
✅ Updated product 124: $195.00
✅ Updated product 125: $14.99
✅ Updated product 126: $43.99
✅ Updated product 127: $87.50

🔔 Checking for price alerts...

📊 Found 2 active alerts to process
🎯 Alert details:
   📧 user1@example.com (user-id-1)
      • Product: Product Name 1
      • Price: $28.50 (Target: $25.00)
      • Alert ID: 456
   📧 user2@example.com (user-id-2)
      • Product: Product Name 4
      • Price: $43.99 (Target: $40.00)
      • Alert ID: 457

📧 Sending email to user1@example.com...
   Product: Product Name 1
   Price: $28.50 (Target: $25.00)
   ✅ Email sent successfully!

📧 Sending email to user2@example.com...
   Product: Product Name 4
   Price: $43.99 (Target: $40.00)
   ✅ Email sent successfully!

✅ Scheduled scraper job completed successfully!
```

## Step 5: Manual Testing

### 5.1 Trigger Manual Scrape
You can manually trigger a scrape using the API:

```bash
curl -X POST https://your-service-name.region.awsapprunner.com/trigger
```

### 5.2 Verify Database Updates
Check your database to confirm:
- Product prices are being updated
- Alert notifications are being sent
- Notification logs are being recorded

## Step 6: Troubleshooting

### 6.1 Common Issues

**Build Fails:**
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check App Runner logs for specific error messages

**Service Won't Start:**
- Verify all environment variables are set correctly
- Check database connectivity
- Review application logs for startup errors

**Cron Job Not Running:**
- Verify the cron schedule in server.js (`*/10 * * * *`)
- Check application logs for cron trigger messages
- Ensure the service is running and healthy

**Database Connection Issues:**
- Verify database credentials
- Check VPC/security group settings
- Ensure database allows connections from App Runner

### 6.2 Log Analysis
Look for these key indicators in logs:
- `⏰ Cron trigger:` - Cron job started
- `📦 Found X products` - Products found to scrape
- `👥 Processing products for X users` - Users being processed
- `✅ Updated product` - Successful price updates
- `📧 Sending email` - Email notifications being sent
- `✅ Scheduled scraper job completed` - Job finished successfully

## Step 7: Scaling and Optimization

### 7.1 Performance Monitoring
- Monitor CPU and memory usage in App Runner console
- Adjust instance size if needed
- Set up CloudWatch alarms for error rates

### 7.2 Cost Optimization
- Monitor usage patterns
- Adjust auto-scaling settings
- Consider reserved capacity for predictable workloads

## Step 8: Security Considerations

### 8.1 Environment Variables
- Never commit sensitive data to git
- Use AWS Secrets Manager for production secrets
- Rotate API keys regularly

### 8.2 Network Security
- Configure VPC if needed for database access
- Use SSL/TLS for all connections
- Implement proper IAM roles

## Success Criteria

Your deployment is successful when:
✅ Service is healthy and responding
✅ Cron job runs every 10 minutes
✅ Logs show detailed user and product information
✅ Price updates are being recorded in database
✅ Email notifications are being sent
✅ Manual trigger endpoint works

## Next Steps

1. **Set up monitoring**: Configure CloudWatch alarms
2. **Implement error handling**: Add retry logic for failed scrapes
3. **Add more vendors**: Extend scraper to support additional sites
4. **Implement rate limiting**: Prevent overwhelming target websites
5. **Add analytics**: Track scraping success rates and performance

---

## Quick Reference Commands

```bash
# Check service health
curl https://your-service-name.region.awsapprunner.com/health

# Trigger manual scrape
curl -X POST https://your-service-name.region.awsapprunner.com/trigger

# View service logs (in AWS Console)
# Go to App Runner > Your Service > Logs tab
```

## Support

If you encounter issues:
1. Check App Runner service logs
2. Verify all environment variables
3. Test database connectivity
4. Review this guide for troubleshooting steps
