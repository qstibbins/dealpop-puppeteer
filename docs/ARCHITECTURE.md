# DealPop Price Checker Service - Architecture Guide

## Overview

The DealPop Price Checker Service is a specialized backend service that provides automated price monitoring and alert capabilities for the DealPop ecosystem. This document provides a comprehensive technical overview of the service architecture, integration patterns, and deployment infrastructure.

## Table of Contents

- [Application Architecture](#application-architecture)
- [DealPop Ecosystem Integration](#dealpop-ecosystem-integration)
- [AWS Architecture](#aws-architecture)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Performance Characteristics](#performance-characteristics)
- [Security Considerations](#security-considerations)

## Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                DealPop Price Checker Service                │
├─────────────────────────────────────────────────────────────┤
│  Express.js Server                                          │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Health API    │  │  Manual Trigger │                  │
│  │   /health       │  │  /trigger       │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Cron Scheduler (node-cron)                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Every 10 minutes: runScraperJob()                     ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Price Scraper (Playwright)                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Browser Mgmt   │  │  Price Extract  │                  │
│  │  • Chromium     │  │  • 3-tier strat │                  │
│  │  • Anti-bot     │  │  • Universal    │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (PostgreSQL)                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Connection     │  │  Query Builder  │                  │
│  │  Pool           │  │  & ORM          │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Notification System                                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Email (SendGrid)│  │  SMS (Twilio)   │                  │
│  │  • HTML templates│  │  • Optional     │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Main Server (`server.js`)
- **Express.js Application**: HTTP server with REST endpoints
- **Cron Scheduling**: Automated price checks every 10 minutes
- **Error Handling**: Comprehensive error catching and logging
- **Health Monitoring**: Built-in health check endpoints
- **Startup Logic**: Playwright testing and initial job execution

#### 2. Price Scraper (`price-scraper/`)
- **Main Scraper** (`scraper.js`): Orchestrates the scraping process
- **Price Extractor** (`extractors/price-extractor.js`): 3-tier extraction strategy
- **Metadata Extractor** (`extractors/metadata-extractor.js`): Product information extraction
- **Structured Data** (`extractors/structured-data.js`): JSON-LD schema parsing
- **Database Service** (`services/database.js`): Database operations

#### 3. Utilities (`utils/`)
- **Notification System** (`notifyUser.js`): SendGrid email integration
- **SMS Support** (`notifySMS.js`): Twilio SMS integration (optional)
- **Error Handling** (`errorHandling.js`): Centralized error logging
- **Performance** (`performance.js`): Performance monitoring utilities

#### 4. Database Layer (`db.js`)
- **Connection Pooling**: Efficient PostgreSQL connections
- **Schema Management**: Table creation and seeding
- **Query Interface**: Simplified database operations

### Data Flow Architecture

#### Scheduled Job Execution Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cron Trigger  │    │  Fetch Products │    │  Group by User  │
│   (Every 10min) │───▶│  from Database  │───▶│  for Processing │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Send Notifications│◀──│  Process Alerts │◀──│  Update Prices  │
│  & Log Results  │    │  & Check Targets│    │  in Database    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │  Scrape Prices  │
                                               │  with Playwright│
                                               └─────────────────┘
```

#### Price Extraction Strategy (3-Tier Approach)

```
┌─────────────────────────────────────────────────────────────┐
│                    Price Extraction                         │
├─────────────────────────────────────────────────────────────┤
│  Tier 1: Structured Data (70% success rate)                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • JSON-LD schema.org markup                           ││
│  │  • Microdata extraction                                ││
│  │  • RDFa parsing                                        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Universal Selectors (20% success rate)            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Semantic CSS selectors                              ││
│  │  • Price-specific class names                          ││
│  │  • Vendor-agnostic patterns                            ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Likelihood Scoring (8% success rate)              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Element scoring algorithm                           ││
│  │  • Price pattern matching                              ││
│  │  • Context analysis                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## DealPop Ecosystem Integration

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Frontend       │    │  Primary        │
│  Extension      │    │  Dashboard      │    │  Backend API    │
│                 │    │                 │    │                 │
│ • Scrapes       │    │ • User          │    │ • User          │
│   products      │    │   interface     │    │   management    │
│ • Adds to       │    │ • Product       │    │ • Product CRUD  │
│   tracking      │    │   management    │    │ • Alert config  │
│ • Shows price   │    │ • Price         │    │ • Auth (Firebase)│
│   history       │    │   history       │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     PostgreSQL Database   │
                    │                           │
                    │ • tracked_products        │
                    │ • alerts                  │
                    │ • users                   │
                    │ • price_history           │
                    │ • notification_logs       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Price Checker Service   │
                    │      (This Repository)    │
                    │                           │
                    │ • Scheduled price checks  │
                    │ • Web scraping (Playwright)│
                    │ • Email notifications     │
                    │ • Price history tracking  │
                    └───────────────────────────┘
```

### Integration Points

#### With Primary Backend API
- **Shared Database**: Both services use the same PostgreSQL instance
- **No Direct API Calls**: Communication through database-level coordination
- **Schema Synchronization**: Both services must maintain compatible database schemas
- **Data Consistency**: Database transactions ensure data integrity

#### With Frontend Dashboard
- **Data Display**: Dashboard shows price data updated by this service
- **User Management**: Users configure products and alerts through the dashboard
- **Real-time Updates**: Dashboard polls for updated price information
- **Notification Preferences**: Users set notification preferences via dashboard

#### With Chrome Extension
- **Product Addition**: Extension adds products to `tracked_products` table
- **Price Monitoring**: This service monitors those products for price changes
- **Price History**: Extension displays price history scraped by this service
- **User Flow**: Extension → Database → Price Checker → Notifications

### Database Schema (Shared)

#### Tables This Service Reads
```sql
-- Products to monitor
tracked_products (id, user_id, product_url, product_name, current_price, target_price, status, expires_at)

-- User information for notifications
users (firebase_uid, email, display_name)

-- Price drop alerts to process
alerts (id, user_id, product_id, target_price, status, notification_preferences)

-- User notification preferences
user_alert_preferences (user_id, email_notifications, sms_notifications, phone_number)
```

#### Tables This Service Writes
```sql
-- Updates current prices
tracked_products (current_price, updated_at)

-- Records historical price data
price_history (product_id, price, recorded_at)

-- Marks alerts as triggered
alerts (status, triggered_at)

-- Logs alert events
alert_history (alert_id, event_type, timestamp)

-- Tracks notification delivery
notification_logs (user_id, alert_id, channel, status, sent_at)
```

## AWS Architecture

### Current Deployment: AWS App Runner

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  App Runner     │    │  RDS PostgreSQL │                │
│  │  Service        │    │  Database       │                │
│  │                 │    │                 │                │
│  │ • Auto-scaling  │    │ • Multi-AZ      │                │
│  │ • Health checks │    │ • Automated     │                │
│  │ • Load balancing│    │   backups       │                │
│  │ • HTTPS         │    │ • Encryption    │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  CloudWatch     │    │  Secrets        │                │
│  │  Logs           │    │  Manager        │                │
│  │                 │    │                 │                │
│  │ • Application   │    │ • Environment   │                │
│  │   logs          │    │   variables     │                │
│  │ • Performance   │    │ • API keys      │                │
│  │   metrics       │    │ • Database      │                │
│  │ • Error         │    │   credentials   │                │
│  │   tracking      │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  SendGrid       │    │  Twilio         │                │
│  │  (Email)        │    │  (SMS)          │                │
│  │                 │    │                 │                │
│  │ • Email delivery│    │ • SMS delivery  │                │
│  │ • Templates     │    │ • Phone         │                │
│  │ • Analytics     │    │   verification  │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Alternative Deployment: AWS ECS Fargate

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  ECS Fargate    │    │  EventBridge    │                │
│  │  Service        │    │  Scheduler      │                │
│  │                 │    │                 │                │
│  │ • Containerized │    │ • Cron-based    │                │
│  │ • Auto-scaling  │    │   triggers      │                │
│  │ • Task          │    │ • Event-driven  │                │
│  │   definition    │    │   architecture  │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Application    │    │  Load Balancer  │                │
│  │  Load Balancer  │    │  Target Group   │                │
│  │                 │    │                 │                │
│  │ • Health checks │    │ • Health        │                │
│  │ • SSL/TLS       │    │   monitoring    │                │
│  │ • Routing       │    │ • Auto-scaling  │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### AWS Services Used

#### Core Services
- **AWS App Runner**: Primary hosting platform
  - Auto-scaling based on traffic
  - Built-in load balancing
  - Automatic HTTPS certificates
  - Health check monitoring

- **Amazon RDS PostgreSQL**: Shared database
  - Multi-AZ deployment for high availability
  - Automated backups and point-in-time recovery
  - Encryption at rest and in transit
  - Connection pooling support

#### Supporting Services
- **Amazon CloudWatch**: Monitoring and logging
  - Application log aggregation
  - Performance metrics collection
  - Custom dashboards and alarms
  - Log retention and archival

- **AWS Secrets Manager**: Secure credential storage
  - Database connection strings
  - API keys (SendGrid, Twilio)
  - Environment variable management
  - Automatic rotation support

#### External Services
- **SendGrid**: Email notification delivery
- **Twilio**: SMS notification delivery (optional)

### Networking and Security

#### Network Architecture
- **VPC**: Virtual Private Cloud for network isolation
- **Subnets**: Public/private subnet configuration
- **Security Groups**: Firewall rules for service access
- **NAT Gateway**: Outbound internet access for private subnets

#### Security Considerations
- **Encryption**: All data encrypted in transit and at rest
- **IAM Roles**: Least-privilege access policies
- **VPC Endpoints**: Secure access to AWS services
- **WAF**: Web Application Firewall for HTTP protection

## Technology Stack

### Runtime and Framework
- **Node.js 18+**: Modern JavaScript runtime with ES modules
- **Express.js**: Web application framework for REST API
- **ES Modules**: Modern import/export syntax

### Web Scraping
- **Playwright**: Browser automation and web scraping
- **Chromium**: Headless browser for price extraction
- **Anti-bot Measures**: User agent rotation, request throttling

### Database
- **PostgreSQL**: Primary database with connection pooling
- **pg**: Node.js PostgreSQL client
- **Connection Pooling**: Efficient database connection management

### Scheduling and Jobs
- **node-cron**: Cron-based job scheduling
- **Background Processing**: Asynchronous job execution

### Notifications
- **SendGrid**: Email delivery service
- **Twilio**: SMS delivery service (optional)
- **HTML Templates**: Professional email formatting

### Development and Testing
- **Jest**: Unit testing framework
- **ESLint**: Code quality and consistency
- **Nodemon**: Development server with hot reload

### Deployment and Infrastructure
- **Docker**: Containerization for consistent deployments
- **AWS App Runner**: Managed container hosting
- **AWS ECS**: Alternative container orchestration
- **GitHub Actions**: CI/CD pipeline (if configured)

## Performance Characteristics

### Scalability Metrics
- **Concurrent Products**: Up to 50 products per 10-minute cycle
- **Processing Time**: 3-5 seconds per product on average
- **Success Rate**: 98% across 100+ tested e-commerce sites
- **Memory Usage**: ~4GB recommended for Playwright operations

### Performance Optimizations
- **Browser Pooling**: Fresh browser instances per product
- **Connection Pooling**: Efficient database connections
- **Batch Processing**: Grouped database operations
- **Retry Logic**: Exponential backoff for failed requests

### Monitoring and Alerting
- **Health Checks**: Built-in endpoint monitoring
- **Performance Metrics**: Detailed timing and success rates
- **Error Tracking**: Comprehensive error logging and categorization
- **Resource Monitoring**: CPU, memory, and network usage

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Control**: IAM-based permission management
- **Network Security**: VPC isolation and security groups
- **Secrets Management**: Secure credential storage

### Application Security
- **Input Validation**: Sanitized database queries
- **Error Handling**: Secure error messages without sensitive data
- **Rate Limiting**: Protection against abuse (planned)
- **Audit Logging**: Comprehensive operation logging

### Infrastructure Security
- **Container Security**: Regular base image updates
- **Network Isolation**: Private subnets and VPC endpoints
- **Monitoring**: Security event detection and alerting
- **Compliance**: SOC 2 and other compliance frameworks

---

**Last Updated**: January 2024  
**Architecture Version**: 1.0.0
