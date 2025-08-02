#!/bin/bash

# Docker Local Run Script with Environment Variables
# This script builds and runs the Docker container with proper environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building and running Docker container locally...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with the following variables:"
    echo ""
    echo "# Required API Keys"
    echo "OPENAI_API_KEY=your-openai-api-key-here"
    echo ""
    echo "# Firebase Configuration"
    echo "NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDBdAWFGw0acg3IBSh9NZPp_m6WiyaW_qA"
    echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=myjobsearchagent.firebaseapp.com"
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=myjobsearchagent"
    echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=myjobsearchagent.appspot.com"
    echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=948357728656"
    echo "NEXT_PUBLIC_FIREBASE_APP_ID=1:948357728656:web:5c1f7ef5658d7efcd0cb15"
    echo "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-3V87TEMNEV"
    echo ""
    echo "# JSearch API"
    echo "NEXT_PUBLIC_JSEARCH_API_KEY=dfa377a0fbmsh8df80548e982bc2p1300b3jsnd59691bcf380"
    echo "NEXT_PUBLIC_JSEARCH_API_HOST=jsearch.p.rapidapi.com"
    echo ""
    echo "# Next.js Environment"
    echo "NODE_ENV=production"
    echo "PORT=8080"
    exit 1
fi

# Source the .env file to get variables
source .env

# Build the Docker image with environment variables from .env file
echo "Building Docker image with environment variables..."
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" \
  --build-arg NEXT_PUBLIC_JSEARCH_API_KEY="$NEXT_PUBLIC_JSEARCH_API_KEY" \
  --build-arg NEXT_PUBLIC_JSEARCH_API_HOST="$NEXT_PUBLIC_JSEARCH_API_HOST" \
  --build-arg NEXT_PUBLIC_TAVUS_API_KEY="$NEXT_PUBLIC_TAVUS_API_KEY" \
  --build-arg NEXT_PUBLIC_RESUME_API_BASE_URL="$NEXT_PUBLIC_RESUME_API_BASE_URL" \
  --build-arg NEXT_PUBLIC_RESUME_API_MODEL_TYPE="$NEXT_PUBLIC_RESUME_API_MODEL_TYPE" \
  --build-arg NEXT_PUBLIC_RESUME_API_MODEL="$NEXT_PUBLIC_RESUME_API_MODEL" \
  --build-arg NEXT_PUBLIC_OPENAI_API_KEY="$NEXT_PUBLIC_OPENAI_API_KEY" \
  -t myjobsearchagent-local \
  -f ci-cd-cloudrun/Dockerfile .

# Run the container with environment variables
echo -e "${YELLOW}Running Docker container...${NC}"
docker run -p 8080:8080 --env-file .env myjobsearchagent-local

echo -e "${GREEN}Container is running at http://localhost:8080${NC}"
