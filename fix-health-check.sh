#!/bin/bash

# Fix health check by rebuilding container with curl installed
echo "🔧 Fixing health check by rebuilding container..."

# Set variables
AWS_PROFILE="dealpop-deploy"
AWS_ACCOUNT_ID="940723107240"
AWS_REGION="us-east-2"
ECR_REPO="dealpop-scraper"
IMAGE_TAG="latest"

echo "📦 Building new Docker image with curl for AMD64 platform..."
docker build --platform linux/amd64 -f Dockerfile.ecs -t ${ECR_REPO}:${IMAGE_TAG} .

echo "🏷️  Tagging image for ECR..."
docker tag ${ECR_REPO}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "⬆️  Pushing updated image to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}

echo "🔄 Updating ECS service to use new image..."
aws ecs update-service \
    --cluster dealpop-scraper-cluster \
    --service dealpop-scraper-service \
    --force-new-deployment \
    --region ${AWS_REGION}

echo "✅ Health check fix deployed!"
echo "🔍 Monitor the deployment in AWS ECS console"
echo "📊 Check logs in CloudWatch: /ecs/dealpop-scraper"
