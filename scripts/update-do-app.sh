#!/bin/bash
set -e

# Configuration
APP_ID=$(grep DO_APP_ID .env.production | cut -d'=' -f2)
GITHUB_USER="forestrebel"
IMAGE_NAME="tiktoken-core"
REGISTRY="ghcr.io"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/${IMAGE_NAME}:latest"

# Create directories
mkdir -p .do

# Create app spec
cat > .do/app.yaml << EOL
name: tiktoken-api
region: sfo
services:
- name: core
  image:
    registry_type: DOCKER_HUB
    repository: ${GITHUB_USER}/${IMAGE_NAME}
    tag: latest
    registry: ${REGISTRY}
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8000
  health_check:
    http_path: /health
    initial_delay_seconds: 30
  routes:
  - path: /
  envs:
  - key: SUPABASE_URL
    scope: RUN_TIME
    value: \${SUPABASE_URL}
  - key: SUPABASE_KEY
    scope: RUN_TIME
    value: \${SUPABASE_KEY}
  - key: JWT_SECRET
    scope: RUN_TIME
    value: \${JWT_SECRET}
  - key: CORS_ORIGINS
    scope: RUN_TIME
    value: \${CORS_ORIGINS}
EOL

# Update DO app
doctl apps update $APP_ID --spec .do/app.yaml

echo "Updated app ${APP_ID} to use ${FULL_IMAGE_NAME}" 