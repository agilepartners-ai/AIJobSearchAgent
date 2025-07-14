#!/bin/bash
# Build script for Docker image

set -e

# Configuration
IMAGE_NAME="aijobsearchagent"
TAG=${1:-latest}
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo "Building Docker image: ${FULL_IMAGE_NAME}"

# Build the image
docker build \
  --platform linux/amd64 \
  --tag "${FULL_IMAGE_NAME}" \
  --file Dockerfile \
  .

echo "✅ Docker image built successfully: ${FULL_IMAGE_NAME}"

# Optional: Test the image
echo "🧪 Testing the image..."
docker run --rm -d \
  --name "${IMAGE_NAME}-test" \
  --publish 8080:8080 \
  "${FULL_IMAGE_NAME}"

# Wait for container to start
sleep 5

# Test health endpoint
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  docker logs "${IMAGE_NAME}-test"
  docker stop "${IMAGE_NAME}-test"
  exit 1
fi

# Test main application
if curl -f http://localhost:8080/ > /dev/null 2>&1; then
  echo "✅ Application is responding"
else
  echo "❌ Application is not responding"
  docker logs "${IMAGE_NAME}-test"
  docker stop "${IMAGE_NAME}-test"
  exit 1
fi

# Stop test container
docker stop "${IMAGE_NAME}-test"

echo "🎉 All tests passed! Image is ready for deployment."
echo ""
echo "To run the container locally:"
echo "  docker run -p 8080:8080 ${FULL_IMAGE_NAME}"
echo ""
echo "To push to Google Container Registry:"
echo "  docker tag ${FULL_IMAGE_NAME} gcr.io/YOUR_PROJECT_ID/${IMAGE_NAME}:${TAG}"
echo "  docker push gcr.io/YOUR_PROJECT_ID/${IMAGE_NAME}:${TAG}"