#!/bin/bash

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Error: Docker is not running"
        exit 1
    fi
}

# Function to wait for Firebase emulators
wait_for_firebase() {
    echo "Waiting for Firebase emulators to start..."
    timeout=60
    while ! curl -s http://localhost:4000 > /dev/null; do
        timeout=$((timeout - 1))
        if [ $timeout -le 0 ]; then
            echo "Error: Firebase emulators failed to start"
            exit 1
        fi
        sleep 1
    done
    echo "Firebase emulators are ready!"
}

# Function to run tests
run_tests() {
    echo "Running tests..."
    docker-compose -f docker-compose.test.yml run --rm test npm run test
}

# Function to clean up
cleanup() {
    echo "Cleaning up..."
    docker-compose -f docker-compose.test.yml down -v
}

# Main execution
main() {
    # Check Docker
    check_docker

    # Clean up any existing containers
    cleanup

    # Start containers
    echo "Starting test environment..."
    docker-compose -f docker-compose.test.yml up -d firebase

    # Wait for Firebase emulators
    wait_for_firebase

    # Run tests
    run_tests

    # Clean up
    cleanup
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main 