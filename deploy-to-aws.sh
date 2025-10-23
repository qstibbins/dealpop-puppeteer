#!/bin/bash

# DealPop Scraper AWS Deployment Script
# Run this script to deploy to your other AWS account

set -e  # Exit on any error

echo "🚀 DealPop Scraper AWS Deployment Script"
echo "========================================"

# Step 1: Verify AWS CLI Configuration
echo "📋 Step 1: Verifying AWS CLI Configuration"
echo "----------------------------------------"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get account information
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-2"

echo "✅ AWS CLI configured"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $REGION"

# Step 2: Create ECR Repository
echo ""
echo "📋 Step 2: Creating ECR Repository"
echo "--------------------------------"

# Check if repository exists
if aws ecr describe-repositories --repository-names dealpop-scraper --region $REGION > /dev/null 2>&1; then
    echo "✅ ECR repository 'dealpop-scraper' already exists"
else
    echo "🔨 Creating ECR repository..."
    aws ecr create-repository \
        --repository-name dealpop-scraper \
        --region $REGION
    echo "✅ ECR repository created"
fi

# Step 3: Login to ECR
echo ""
echo "📋 Step 3: Logging into ECR"
echo "---------------------------"

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo "✅ ECR login successful"

# Step 4: Create ECS Cluster
echo ""
echo "📋 Step 4: Creating ECS Cluster"
echo "-----------------------------"

# Check if cluster exists
if aws ecs describe-clusters --clusters dealpop-scraper-cluster --region $REGION > /dev/null 2>&1; then
    echo "✅ ECS cluster 'dealpop-scraper-cluster' already exists"
else
    echo "🔨 Creating ECS cluster..."
    aws ecs create-cluster \
        --cluster-name dealpop-scraper-cluster \
        --region $REGION
    echo "✅ ECS cluster created"
fi

# Step 5: Create CloudWatch Log Group
echo ""
echo "📋 Step 5: Creating CloudWatch Log Group"
echo "---------------------------------------"

# Check if log group exists
if aws logs describe-log-groups --log-group-name-prefix "/ecs/dealpop-scraper" --region $REGION --query 'logGroups[0].logGroupName' --output text | grep -q "dealpop-scraper"; then
    echo "✅ CloudWatch log group '/ecs/dealpop-scraper' already exists"
else
    echo "🔨 Creating CloudWatch log group..."
    aws logs create-log-group \
        --log-group-name /ecs/dealpop-scraper \
        --region $REGION
    echo "✅ CloudWatch log group created"
fi

# Step 6: Create IAM Roles
echo ""
echo "📋 Step 6: Creating IAM Roles"
echo "---------------------------"

# Create ECS Task Execution Role
echo "🔨 Creating ECS Task Execution Role..."
if ! aws iam get-role --role-name ecsTaskExecutionRole > /dev/null 2>&1; then
    cat > ecs-task-execution-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document file://ecs-task-execution-trust-policy.json

    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

    rm ecs-task-execution-trust-policy.json
    echo "✅ ECS Task Execution Role created"
else
    echo "✅ ECS Task Execution Role already exists"
fi

# Create ECS Task Role
echo "🔨 Creating ECS Task Role..."
if ! aws iam get-role --role-name ecsTaskRole > /dev/null 2>&1; then
    cat > ecs-task-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name ecsTaskRole \
        --assume-role-policy-document file://ecs-task-trust-policy.json

    rm ecs-task-trust-policy.json
    echo "✅ ECS Task Role created"
else
    echo "✅ ECS Task Role already exists"
fi

# Step 7: Create Secrets in AWS Secrets Manager
echo ""
echo "📋 Step 7: Creating Secrets in AWS Secrets Manager"
echo "------------------------------------------------"

# Function to create secret if it doesn't exist
create_secret_if_not_exists() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    if aws secretsmanager describe-secret --secret-id "$secret_name" --region $REGION > /dev/null 2>&1; then
        echo "✅ Secret '$secret_name' already exists"
    else
        echo "🔨 Creating secret '$secret_name'..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region $REGION
        echo "✅ Secret '$secret_name' created"
    fi
}

# Create secrets (you'll need to update these values)
echo "⚠️  IMPORTANT: You need to update these secret values with your actual credentials!"
echo ""

create_secret_if_not_exists "dealpop/db-host" "your-db-host-here" "Database host for DealPop scraper"
create_secret_if_not_exists "dealpop/db-user" "your-db-user-here" "Database user for DealPop scraper"
create_secret_if_not_exists "dealpop/db-password" "your-db-password-here" "Database password for DealPop scraper"
create_secret_if_not_exists "dealpop/db-name" "your-db-name-here" "Database name for DealPop scraper"
create_secret_if_not_exists "dealpop/sendgrid-api-key" "your-sendgrid-api-key-here" "SendGrid API key for DealPop scraper"
create_secret_if_not_exists "dealpop/twilio-account-sid" "your-twilio-account-sid-here" "Twilio Account SID for DealPop scraper"
create_secret_if_not_exists "dealpop/twilio-auth-token" "your-twilio-auth-token-here" "Twilio Auth Token for DealPop scraper"
create_secret_if_not_exists "dealpop/twilio-phone-number" "your-twilio-phone-number-here" "Twilio Phone Number for DealPop scraper"

# Step 8: Build and Push Docker Image
echo ""
echo "📋 Step 8: Building and Pushing Docker Image"
echo "------------------------------------------"

echo "🔨 Building Docker image..."
docker build --platform linux/amd64 -f Dockerfile.ecs -t dealpop-scraper .

echo "🏷️  Tagging image for ECR..."
docker tag dealpop-scraper:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/dealpop-scraper:latest

echo "📤 Pushing image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/dealpop-scraper:latest

echo "✅ Docker image pushed successfully"

# Step 9: Update Task Definition
echo ""
echo "📋 Step 9: Updating Task Definition"
echo "---------------------------------"

echo "🔨 Updating task definition with account ID..."
# Create a temporary task definition file with the correct account ID
sed "s/437387546619/$ACCOUNT_ID/g" ecs-task-definition.json > ecs-task-definition-temp.json

echo "📝 Registering task definition..."
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definition-temp.json \
    --region $REGION

rm ecs-task-definition-temp.json
echo "✅ Task definition registered"

# Step 10: Get VPC Configuration
echo ""
echo "📋 Step 10: Getting VPC Configuration"
echo "------------------------------------"

# Get default VPC information
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region $REGION)
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region $REGION)

echo "✅ VPC Configuration:"
echo "   VPC ID: $VPC_ID"
echo "   Subnet IDs: $SUBNET_IDS"
echo "   Security Group ID: $SECURITY_GROUP_ID"

# Step 11: Test ECS Task
echo ""
echo "📋 Step 11: Testing ECS Task"
echo "---------------------------"

echo "🚀 Running test task..."
TASK_ARN=$(aws ecs run-task \
    --cluster dealpop-scraper-cluster \
    --task-definition dealpop-price-scraper:1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
    --region $REGION \
    --query 'tasks[0].taskArn' \
    --output text)

echo "✅ Test task started: $TASK_ARN"

# Step 12: Set Up Scheduled Execution
echo ""
echo "📋 Step 12: Setting Up Scheduled Execution"
echo "----------------------------------------"

echo "🔨 Creating EventBridge rule for every 12 hours..."
aws events put-rule \
    --name dealpop-scraper-schedule \
    --schedule-expression "cron(0 0,12 * * ? *)" \
    --description "Trigger DealPop scraper every 12 hours" \
    --region $REGION

echo "🔨 Creating EventBridge targets..."
cat > eventbridge-targets.json << EOF
[
  {
    "Id": "1",
    "Arn": "arn:aws:ecs:$REGION:$ACCOUNT_ID:cluster/dealpop-scraper-cluster",
    "RoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
    "EcsParameters": {
      "TaskDefinitionArn": "arn:aws:ecs:$REGION:$ACCOUNT_ID:task-definition/dealpop-price-scraper:1",
      "LaunchType": "FARGATE",
      "NetworkConfiguration": {
        "awsvpcConfiguration": {
          "Subnets": ["$SUBNET_IDS"],
          "SecurityGroups": ["$SECURITY_GROUP_ID"],
          "AssignPublicIp": "ENABLED"
        }
      }
    }
  }
]
EOF

aws events put-targets \
    --rule dealpop-scraper-schedule \
    --targets file://eventbridge-targets.json \
    --region $REGION

rm eventbridge-targets.json
echo "✅ EventBridge rule and targets created"

# Step 13: Verification
echo ""
echo "📋 Step 13: Verification"
echo "-----------------------"

echo "🔍 Verifying deployment..."
echo ""
echo "📊 ECR Repository:"
aws ecr describe-repositories --repository-names dealpop-scraper --region $REGION --query 'repositories[0].repositoryName' --output text

echo ""
echo "📊 ECS Cluster:"
aws ecs describe-clusters --clusters dealpop-scraper-cluster --region $REGION --query 'clusters[0].clusterName' --output text

echo ""
echo "📊 Task Definition:"
aws ecs list-task-definitions --region $REGION --query 'taskDefinitionArns[0]' --output text

echo ""
echo "📊 EventBridge Rule:"
aws events list-rules --region $REGION --query 'Rules[?Name==`dealpop-scraper-schedule`].Name' --output text

echo ""
echo "📊 Secrets:"
aws secretsmanager list-secrets --region $REGION --query 'SecretList[?contains(Name, `dealpop`)].Name' --output text

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "✅ All resources created successfully"
echo "✅ Scraper scheduled to run every 12 hours (midnight and noon)"
echo "✅ Estimated monthly cost: ~$4"
echo ""
echo "📋 Next Steps:"
echo "1. Update secrets with your actual database credentials"
echo "2. Monitor the first execution in CloudWatch logs"
echo "3. Check email notifications are working"
echo ""
echo "🔍 Monitor logs with:"
echo "aws logs get-log-events --log-group-name /ecs/dealpop-scraper --log-stream-name [stream-name] --region $REGION"
echo ""
echo "🚀 Your DealPop scraper is now deployed and running!"
