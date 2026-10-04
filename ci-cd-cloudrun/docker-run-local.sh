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
    echo "# Supabase (authentication only)"
    echo "NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>"
    echo ""
    echo "# PostgreSQL (see db/README.md)"
    echo "DATABASE_URL=postgres://jobsearch_app:<password>@<host>:5432/jobsearch"
    echo "PG_SSL_CA=<CA certificate on one line, newlines as \\n>"
    echo "DOCUMENT_SIGNING_SECRET=<24+ random characters>"
    echo ""
    echo "# JSearch API"
    echo "NEXT_PUBLIC_JSEARCH_API_KEY=<your RapidAPI key>"
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
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
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
