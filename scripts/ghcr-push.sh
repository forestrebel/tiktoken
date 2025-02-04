#!/bin/bash
set -e

# Configuration
GITHUB_USER="forestrebel"
IMAGE_NAME="tiktoken-core"
REGISTRY="ghcr.io"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/${IMAGE_NAME}:latest"

# Get GitHub token from environment or .env.production
if [ -z "$GITHUB_TOKEN" ]; then
    GITHUB_TOKEN=$(grep GITHUB_TOKEN .env.production | cut -d'=' -f2)
fi

# Login to GHCR
echo "$GITHUB_TOKEN" | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Tag and push
docker tag $IMAGE_NAME $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

echo "Successfully pushed ${FULL_IMAGE_NAME}" 