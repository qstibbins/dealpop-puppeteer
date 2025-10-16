# Quick Deployment Checklist

## Pre-Deployment Checklist
- [ ] All code committed to GitHub repository
- [ ] Database credentials ready
- [ ] SendGrid API key obtained
- [ ] Twilio credentials ready (optional)
- [ ] AWS CLI configured with proper permissions

## Environment Variables Needed
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

## Deployment Steps
1. [ ] Go to AWS App Runner Console
2. [ ] Create new service
3. [ ] Connect to GitHub repository
4. [ ] Use apprunner.yaml configuration
5. [ ] Add all environment variables
6. [ ] Set auto-scaling (min: 1, max: 3)
7. [ ] Configure health check path: `/health`
8. [ ] Deploy and wait for build completion

## Post-Deployment Verification
- [ ] Service health check passes: `curl https://your-service-url/health`
- [ ] Manual trigger works: `curl -X POST https://your-service-url/trigger`
- [ ] Cron job runs every 10 minutes (check logs)
- [ ] Logs show detailed user and product information
- [ ] Database updates are working
- [ ] Email notifications are being sent

## Expected Log Pattern (Every 10 Minutes)
```
⏰ Cron trigger: Starting scheduled scraper job
🕐 Starting scheduled price check...
📦 Found X products to check
👥 Processing products for X users:
   📧 user@example.com (user-id): X products
      • Product Name (Vendor) - Current: $X.XX, Target: $X.XX
📝 Updating database...
✅ Updated product X: $X.XX
🔔 Checking for price alerts...
📊 Found X active alerts to process
📧 Sending email to user@example.com...
✅ Email sent successfully!
✅ Scheduled scraper job completed successfully!
```

## Troubleshooting
- **Build fails**: Check Dockerfile and dependencies
- **Service won't start**: Verify environment variables
- **Cron not running**: Check cron schedule in server.js
- **DB connection issues**: Verify credentials and network access
- **No logs**: Check App Runner service logs tab

## Success Indicators
✅ Service responds to health checks
✅ Cron job triggers every 10 minutes
✅ Detailed logs show users and products
✅ Price updates recorded in database
✅ Email notifications sent successfully
✅ Manual trigger endpoint works
