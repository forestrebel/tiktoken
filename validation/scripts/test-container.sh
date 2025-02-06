#!/bin/bash
set -e

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Ensure clean state
cleanup() {
    echo "Cleaning up containers and volumes..."
    docker compose -f docker-compose.test.yml down -v
    rm -rf "$PROJECT_DIR/tmp"/* "$PROJECT_DIR/state"/*
}

# Run cleanup on script exit
trap cleanup EXIT

# Generate test fixtures
echo "Generating test fixtures..."
node "$PROJECT_DIR/scripts/generate_fixtures.js"

# Build and run tests in container
echo "Running tests in container..."
docker compose -f docker-compose.test.yml build
docker compose -f docker-compose.test.yml run \
    --rm \
    validation \
    npm test

# Check exit code
TEST_EXIT=$?
if [ $TEST_EXIT -eq 0 ]; then
    echo "✅ Tests passed successfully"
else
    echo "❌ Tests failed with exit code $TEST_EXIT"
    exit $TEST_EXIT
fi
