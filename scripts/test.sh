#!/bin/bash

# Exit on error
set -e

# Start Firebase emulators
echo "Starting Firebase emulators..."
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d firebase

# Wait for emulators to be ready
echo "Waiting for emulators..."
timeout=30
while [ $timeout -gt 0 ]; do
    if curl -s http://localhost:4000 > /dev/null; then
        echo "Firebase emulators are ready"
        break
    fi
    echo "Waiting... ${timeout}s remaining"
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
    echo "Error: Firebase emulators failed to start"
    exit 1
fi

# Run tests
echo "Running tests..."
yarn test

# Cleanup
echo "Cleaning up..."
docker compose -f docker-compose.yml -f docker-compose.test.yml down 