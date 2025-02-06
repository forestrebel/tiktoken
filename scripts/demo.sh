#!/bin/bash

# Prepare for demo
# Usage: ./demo.sh

# Validate environment
echo "Validating environment..."
if [ ! -f "app/src/assets/test_video.mp4" ]; then
    echo "Error: Test video not found"
    exit 1
fi

# Check app dependencies
echo "Checking dependencies..."
cd app
if [ ! -d "node_modules" ]; then
    echo "Error: Dependencies not installed"
    exit 1
fi

# Verify video player
echo "Verifying video player..."
if [ ! -f "src/components/Player.js" ]; then
    echo "Error: Video player component not found"
    exit 1
fi

# Start demo
echo "Starting demo..."
npm start 