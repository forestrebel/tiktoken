#!/bin/bash
set -euo pipefail

# Required environment variables
: "${REGISTRY_URL:?REGISTRY_URL environment variable is required}"
: "${DEPLOY_TOKEN:?DEPLOY_TOKEN environment variable is required}"

# Deploy and verify
case "${1:-}" in
    "build")
        echo "Building service..."
        docker compose build core
        ;;
    "services")
        echo "Deploying services..."
        docker compose up -d core
        ;;
    "verify")
        echo "Verifying deployment..."
        curl -sf http://localhost:8000/health
        ;;
    *)
        echo "Usage: $0 {build|services|verify}"
        exit 1
        ;;
esac 