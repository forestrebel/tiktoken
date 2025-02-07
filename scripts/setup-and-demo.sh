#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Basic error handling
set -e

# Environment setup
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-11-openjdk-amd64}"

# Quick environment check
check_env() {
    # Check Android SDK
    if [ ! -d "$ANDROID_HOME" ]; then
        echo -e "${RED}Error: Android SDK not found at $ANDROID_HOME${NC}"
        echo "Please install Android Studio and create a Pixel7Pro AVD"
        exit 1
    fi

    # Check Java
    if ! command -v java &>/dev/null; then
        echo -e "${RED}Error: Java not found${NC}"
        echo "Run: sudo apt-get install openjdk-11-jdk"
        exit 1
    fi

    # Check for Pixel7Pro AVD
    if ! $ANDROID_HOME/emulator/emulator -list-avds | grep -q "Pixel7Pro"; then
        echo -e "${RED}Error: Pixel7Pro AVD not found${NC}"
        echo "Please create a Pixel7Pro AVD in Android Studio"
        exit 1
    fi
}

# Update PATH if needed
update_path() {
    # Add Android tools to PATH if not already present
    local android_paths=(
        "$ANDROID_HOME/emulator"
        "$ANDROID_HOME/platform-tools"
        "$ANDROID_HOME/tools"
        "$ANDROID_HOME/tools/bin"
    )

    for path in "${android_paths[@]}"; do
        if [[ ":$PATH:" != *":$path:"* ]]; then
            export PATH="$PATH:$path"
        fi
    done
}

# Cleanup function
cleanup() {
    echo -e "\n${GREEN}Cleaning up...${NC}"
    # Kill background processes
    kill $EMULATOR_PID $METRO_PID 2>/dev/null || true
    # Clean temp files
    rm -rf $TMPDIR/metro-* 2>/dev/null || true
}

# Main setup and demo
main() {
    echo -e "${GREEN}Setting up environment...${NC}"
    
    # Check environment
    check_env
    update_path

    # Start emulator
    echo -e "${GREEN}Starting emulator...${NC}"
    $ANDROID_HOME/emulator/emulator -avd Pixel7Pro -no-snapshot-load -no-audio &
    EMULATOR_PID=$!

    # Wait for emulator
    echo -e "${GREEN}Waiting for emulator to boot...${NC}"
    adb wait-for-device
    while [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do
        sleep 2
    done

    # Start Metro bundler
    echo -e "${GREEN}Starting Metro bundler...${NC}"
    yarn start --reset-cache &
    METRO_PID=$!

    # Install and launch app
    echo -e "${GREEN}Installing and launching app...${NC}"
    yarn android

    # Keep running until interrupted
    echo -e "${GREEN}Setup complete! Press Ctrl+C to exit${NC}"
    wait
}

# Set up cleanup trap
trap cleanup EXIT

# Run main function
main 