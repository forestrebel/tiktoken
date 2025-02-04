#!/bin/bash
set -e

# Check if token is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <github-token>"
    echo "Please provide a GitHub token with write:packages permission"
    exit 1
fi

NEW_TOKEN=$1

# Update token in .env.production
sed -i "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${NEW_TOKEN}/" .env.production

echo "GitHub token updated in .env.production" 