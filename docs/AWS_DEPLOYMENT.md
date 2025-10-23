# DealPop Price Checker Service - AWS Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the DealPop Price Checker Service to AWS. The service can be deployed using multiple methods depending on your requirements and technical expertise.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Methods](#deployment-methods)
  - [Method 1: AWS Console (Non-Technical)](#method-1-aws-console-non-technical)
  - [Method 2: AWS CLI (Developer-Friendly)](#method-2-aws-cli-developer-friendly)
  - [Method 3: AWS ECS (Alternative)](#method-3-aws-ecs-alternative)
- [IAM Permissions](#iam-permissions)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### AWS Account Setup
- Active AWS account with appropriate permissions
- AWS CLI installed and configured (for CLI deployment)
- GitHub repository access (for App Runner deployment)

### Database Setup
- **PostgreSQL Database**: RDS instance (likely already exists from Primary Backend)
- **Connection Details**: Host, port, database name, credentials
- **Network Access**: Ensure App Runner can connect to RDS

### Required Services
- **SendGrid Account**: For email notifications
- **Twilio Account**: For SMS notifications (optional)
- **GitHub Repository**: Source code repository

## Deployment Methods

### Method 1: AWS Console (Non-Technical)

This method uses the AWS Management Console for a visual, step-by-step deployment process.

#### Step 1: Create App Runner Service

1. **Navigate to App Runner**
   - Go to AWS Management Console
   - Search for "App Runner" in the services search
   - Click "Create service"

2. **Configure Source**
   - Select "Source code repository"
   - Connect to GitHub (if not already connected)
   - Choose your repository: `deal-pop/puppeteer-scraper`
   - Select branch: `main` (or your deployment branch)

3. **Configure Build Settings**
   ```
   Configuration file: Use a configuration file
   Configuration file: apprunner.yaml
   ```

4. **Configure Service Settings**
   - **Service name**: `dealpop-price-checker`
   - **Virtual CPU**: 1 vCPU
   - **Virtual memory**: 2 GB
   - **Environment variables**: (See Environment Variables section below)

5. **Configure Health Check**
   - **Health check path**: `/health`
   - **Health check interval**: 20 seconds
   - **Health check timeout**: 2 seconds
   - **Healthy threshold**: 1
   - **Unhealthy threshold**: 5

6. **Review and Create**
   - Review all settings
   - Click "Create & deploy"

#### Step 2: Configure Environment Variables

After the service is created, add the required environment variables:

1. **Go to Service Settings**
   - Navigate to your App Runner service
   - Click "Configuration" tab
   - Click "Edit" in the Environment variables section

2. **Add Required Variables**
   ```
   DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=dealpop
   DB_USER=your-db-username
   DB_PASSWORD=your-db-password
   DB_SSL=true
   
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@dealpop.com
   
   NODE_ENV=production
   PORT=3000
   ```

3. **Save Configuration**
   - Click "Save changes"
   - The service will automatically redeploy

#### Step 3: Verify Deployment

1. **Check Service Status**
   - Go to your App Runner service dashboard
   - Verify status is "Running"
   - Note the service URL

2. **Test Health Endpoint**
   ```bash
   curl https://your-service-url.awsapprunner.com/health
   ```

3. **Test Manual Trigger**
   ```bash
   curl -X POST https://your-service-url.awsapprunner.com/trigger
   ```

### Method 2: AWS CLI (Developer-Friendly)

This method uses the AWS CLI and existing deployment scripts for automated deployment.

#### Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### Step 1: Prepare Environment Variables

Create a `.env.production` file:
```bash
# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=dealpop
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_SSL=true

# Notification Services
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@dealpop.com
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Application Configuration
NODE_ENV=production
PORT=3000
```

#### Step 2: Deploy Using Script

```bash
# Make deployment script executable
chmod +x deploy-to-aws.sh

# Run deployment script
./deploy-to-aws.sh
```

The script will:
1. Build the Docker image
2. Push to Amazon ECR
3. Create/update App Runner service
4. Configure environment variables
5. Deploy the service

#### Step 3: Verify Deployment

```bash
# Get service URL
aws apprunner describe-service --service-arn your-service-arn --query 'Service.ServiceUrl' --output text

# Test health endpoint
curl https://your-service-url.awsapprunner.com/health

# Test manual trigger
curl -X POST https://your-service-url.awsapprunner.com/trigger
```

### Method 3: AWS ECS (Alternative)

Use ECS Fargate for more control over the deployment and scheduling.

#### When to Use ECS
- Need more control over container configuration
- Want to use EventBridge for scheduling instead of cron
- Require custom networking or security configurations
- Need to integrate with existing ECS infrastructure

#### Step 1: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name dealpop-price-checker

# Create task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

#### Step 2: Create ECS Service

```bash
# Create ECS service
aws ecs create-service \
  --cluster dealpop-price-checker \
  --service-name price-checker-service \
  --task-definition dealpop-price-checker:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### Step 3: Configure EventBridge Scheduling

```bash
# Create EventBridge rule for scheduling
aws events put-rule \
  --name price-checker-schedule \
  --schedule-expression "rate(10 minutes)" \
  --state ENABLED

# Add ECS task as target
aws events put-targets \
  --rule price-checker-schedule \
  --targets "Id"="1","Arn"="arn:aws:ecs:region:account:cluster/dealpop-price-checker","RoleArn"="arn:aws:iam::account:role/ecsTaskExecutionRole","EcsParameters"="{TaskDefinitionArn=arn:aws:ecs:region:account:task-definition/dealpop-price-checker:1,LaunchType=FARGATE,NetworkConfiguration={awsvpcConfiguration={Subnets=[subnet-12345],SecurityGroups=[sg-12345],AssignPublicIp=ENABLED}}}"
```

## IAM Permissions

### Required IAM Policy

Create an IAM policy with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "apprunner:CreateService",
                "apprunner:DeleteService",
                "apprunner:DescribeService",
                "apprunner:ListServices",
                "apprunner:UpdateService",
                "apprunner:StartDeployment",
                "apprunner:ListOperations"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:PassRole",
                "iam:GetRole"
            ],
            "Resource": "arn:aws:iam::*:role/*AppRunner*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances",
                "rds:DescribeDBClusters"
            ],
            "Resource": "*"
        }
    ]
}
```

### Creating IAM User

1. **Create IAM User**
   ```bash
   aws iam create-user --user-name dealpop-deployer
   ```

2. **Attach Policy**
   ```bash
   aws iam attach-user-policy \
     --user-name dealpop-deployer \
     --policy-arn arn:aws:iam::account:policy/DealPopDeploymentPolicy
   ```

3. **Create Access Keys**
   ```bash
   aws iam create-access-key --user-name dealpop-deployer
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL database host | `dealpop-db.cluster-xyz.us-east-1.rds.amazonaws.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `dealpop` |
| `DB_USER` | Database username | `dealpop_user` |
| `DB_PASSWORD` | Database password | `secure_password_123` |
| `DB_SSL` | Enable SSL connection | `true` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.abc123...` |
| `SENDGRID_FROM_EMAIL` | From email address | `noreply@dealpop.com` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Application port | `3000` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `AC1234567890abcdef` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `your_twilio_token` |
| `LOG_LEVEL` | Logging level | `info` |

### Setting Environment Variables

#### App Runner Console
1. Go to your App Runner service
2. Click "Configuration" tab
3. Click "Edit" in Environment variables section
4. Add each variable with its value
5. Click "Save changes"

#### AWS CLI
```bash
aws apprunner update-service \
  --service-arn your-service-arn \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "your-ecr-repo:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "DB_HOST": "your-db-host",
          "DB_PORT": "5432",
          "DB_NAME": "dealpop",
          "DB_USER": "your-db-user",
          "DB_PASSWORD": "your-db-password",
          "DB_SSL": "true",
          "SENDGRID_API_KEY": "your-sendgrid-key",
          "SENDGRID_FROM_EMAIL": "noreply@dealpop.com",
          "NODE_ENV": "production",
          "PORT": "3000"
        }
      }
    }
  }'
```

## Post-Deployment

### Verification Checklist

- [ ] Service is running and healthy
- [ ] Health endpoint responds correctly
- [ ] Manual trigger works
- [ ] Database connection is established
- [ ] Environment variables are set correctly
- [ ] Logs are being generated
- [ ] Notifications are working (test with a sample product)

### Monitoring Setup

#### CloudWatch Logs
1. **View Logs**
   - Go to CloudWatch in AWS Console
   - Navigate to "Log groups"
   - Find your App Runner log group
   - View real-time logs

2. **Set Up Alarms**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "PriceCheckerHealthCheck" \
     --alarm-description "Alert when health check fails" \
     --metric-name "HealthCheckStatus" \
     --namespace "AWS/AppRunner" \
     --statistic "Average" \
     --period 300 \
     --threshold 1 \
     --comparison-operator "LessThanThreshold" \
     --evaluation-periods 2
   ```

#### Health Monitoring
```bash
# Create a simple health check script
#!/bin/bash
HEALTH_URL="https://your-service-url.awsapprunner.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Service is healthy"
else
    echo "Service is unhealthy (HTTP $RESPONSE)"
    # Send alert notification
fi
```

### Cost Monitoring

#### App Runner Costs
- **Compute**: ~$25-50/month for 1 vCPU, 2GB RAM
- **Data Transfer**: Minimal for this service
- **Total Estimated**: $30-60/month

#### ECS Costs
- **Fargate**: ~$15-30/month for 0.25 vCPU, 0.5GB RAM
- **EventBridge**: ~$1/month for scheduling
- **Total Estimated**: $20-35/month

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
**Symptoms**: Service status shows "Failed" or "Stopped"

**Solutions**:
- Check environment variables are set correctly
- Verify database connection details
- Check CloudWatch logs for error messages
- Ensure all required dependencies are installed

#### 2. Health Check Failures
**Symptoms**: Health endpoint returns 500 or times out

**Solutions**:
- Verify database connectivity
- Check if Playwright dependencies are installed
- Review application logs for startup errors
- Ensure port 3000 is exposed correctly

#### 3. Database Connection Issues
**Symptoms**: "Database connection failed" errors

**Solutions**:
- Verify RDS security groups allow App Runner access
- Check database credentials
- Ensure database is in the same VPC or publicly accessible
- Test connection from local environment

#### 4. Playwright/Browser Issues
**Symptoms**: "Playwright test failed" or browser launch errors

**Solutions**:
- Ensure all Playwright dependencies are installed
- Check if Chromium is available in the container
- Verify memory allocation (minimum 2GB recommended)
- Review Playwright installation in Dockerfile

#### 5. Notification Failures
**Symptoms**: Emails/SMS not being sent

**Solutions**:
- Verify SendGrid API key is correct
- Check Twilio credentials (if using SMS)
- Review notification logs for delivery status
- Test with a simple notification first

### Debugging Commands

```bash
# Check service status
aws apprunner describe-service --service-arn your-service-arn

# View recent logs
aws logs tail /aws/apprunner/your-service-name/application --follow

# Test health endpoint
curl -v https://your-service-url.awsapprunner.com/health

# Test manual trigger
curl -X POST -v https://your-service-url.awsapprunner.com/trigger

# Check environment variables
aws apprunner describe-service --service-arn your-service-arn --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

### Getting Help

1. **Check Logs**: Always start with CloudWatch logs
2. **Review Documentation**: [Architecture Guide](./ARCHITECTURE.md)
3. **Common Issues**: [Gotchas Guide](./GOTCHAS.md)
4. **AWS Support**: Use AWS Support for infrastructure issues
5. **Community**: GitHub Issues for application-specific problems

---

**Last Updated**: January 2024  
**Deployment Guide Version**: 1.0.0
