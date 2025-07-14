#!/bin/bash
# Deployment script for Google Cloud Run

set -e

# Configuration - Update these values
PROJECT_ID="your-project-id"
SERVICE_NAME="aijobsearchagent"
REGION="us-central1"
IMAGE_NAME="aijobsearchagent"
TAG=${1:-latest}

# Derived values
FULL_IMAGE_NAME="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${TAG}"

echo "🚀 Deploying to Google Cloud Run..."
echo "Project: ${PROJECT_ID}"
echo "Service: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "Image: ${FULL_IMAGE_NAME}"

# Ensure you're authenticated
echo "📋 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ Not authenticated with Google Cloud. Please run: gcloud auth login"
  exit 1
fi

# Set the project
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the image
echo "🏗️ Building and pushing image..."
gcloud builds submit --tag "${FULL_IMAGE_NAME}" .

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${FULL_IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=8080"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --format 'value(status.url)')

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📊 Service status: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -f "${SERVICE_URL}/health" > /dev/null 2>&1; then
  echo "✅ Health check passed"
else
  echo "⚠️ Health check failed - service might still be starting"
fi

echo "🎉 Deployment complete!"