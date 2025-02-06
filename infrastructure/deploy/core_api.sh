#!/bin/bash
set -euo pipefail

# Required environment variables
: "${SERVICE_NAME:?'SERVICE_NAME is required'}"
: "${IMAGE_URL:?'IMAGE_URL is required'}"
: "${DEPLOY_URL:?'DEPLOY_URL is required'}"
: "${DEPLOY_TOKEN:?'DEPLOY_TOKEN is required'}"

echo "Deploying ${SERVICE_NAME} from ${IMAGE_URL}..."

# 1. Container Build & Push
# (Already done by CLI)

# 2. Service Deployment
# Use platform-agnostic deployment
curl -X POST "${DEPLOY_URL}/deploy" \
    -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"service\":\"${SERVICE_NAME}\",\"image\":\"${IMAGE_URL}\"}"

# 3. Wait for deployment
echo "Waiting for deployment to complete..."
for i in {1..30}; do
    if curl -sf "${DEPLOY_URL}/health"; then
        echo "Deployment successful!"
        exit 0
    fi
    sleep 2
done

echo "Deployment failed - timeout waiting for health check"
exit 1 