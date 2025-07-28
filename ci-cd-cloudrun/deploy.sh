#!/bin/bash

# Cloud Run Deployment Script Hello 
# This script builds and deploys the application to Google Cloud Run

set -e

# Configuration variables (modify these for your project)
# To find your project ID: gcloud config get-value project
# Or set as environment variable: export PROJECT_ID="your-actual-project-id"
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
SERVICE_NAME=${SERVICE_NAME:-"myjobsearchagent"}
REGION=${REGION:-"us-central1"}
REPOSITORY=${REPOSITORY:-"myjobsearchagent-repo"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment to Cloud Run...${NC}"

# Check if required environment variables are set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${RED}Error: Please set PROJECT_ID environment variable${NC}"
    echo "Example: export PROJECT_ID=your-actual-project-id"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID

# Build the image using Cloud Build
echo -e "${YELLOW}Building image with Cloud Build...${NC}"
IMAGE_URL="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE_NAME:$IMAGE_TAG"

gcloud builds submit \
    --config ci-cd-cloudrun/cloudbuild.yaml \
    --substitutions _GAR_LOCATION=$REGION,_REPOSITORY=$REPOSITORY,_SERVICE_NAME=$SERVICE_NAME \
    .

echo -e "${GREEN}Deployment completed successfully!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"

echo -e "${YELLOW}Deployment summary:${NC}"
echo "- Project ID: $PROJECT_ID"
echo "- Service Name: $SERVICE_NAME"
echo "- Region: $REGION"
echo "- Image: $IMAGE_URL"
echo "- Service URL: $SERVICE_URL"
