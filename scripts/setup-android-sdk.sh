#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Exit on error
set -e

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Import validation script
source "$PROJECT_ROOT/scripts/validate-environment.sh"

# Logging function inherited from validate-environment.sh

# Cleanup function
cleanup() {
    log_progress "Cleaning up temporary files..."
    rm -f /tmp/cmdline-tools.zip
    rm -rf /tmp/cmdline-tools
}
trap cleanup EXIT

# Function to download and verify Android command line tools
download_cmdline_tools() {
    local url="https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip"
    local expected_sha256="124f2d5115eee365df6cf3228ffbca6fc3911d16f8025bebd5b1c6e2fcfa7faf"
    
    log_progress "Downloading Android command line tools..."
    wget -q "$url" -O /tmp/cmdline-tools.zip
    
    log_progress "Verifying download..."
    local actual_sha256=$(sha256sum /tmp/cmdline-tools.zip | cut -d' ' -f1)
    if [ "$actual_sha256" != "$expected_sha256" ]; then
        echo -e "${RED}ERROR: Command line tools checksum verification failed${NC}"
        return 1
    fi
    
    return 0
}

# Function to setup Android SDK
setup_android_sdk() {
    # First validate the environment
    if ! validate_basic_env; then
        echo -e "${RED}Environment validation failed. Please fix the issues above.${NC}"
        return 1
    }
    
    # Create SDK directory
    ANDROID_SDK_DIR="${HOME}/Android/Sdk"
    log_progress "Creating Android SDK directory at $ANDROID_SDK_DIR"
    mkdir -p "$ANDROID_SDK_DIR"
    
    # Download and install command line tools if not already present
    CMDLINE_TOOLS_DIR="$ANDROID_SDK_DIR/cmdline-tools/latest"
    if [ ! -d "$CMDLINE_TOOLS_DIR" ]; then
        if ! download_cmdline_tools; then
            return 1
        fi
        
        log_progress "Installing command line tools..."
        mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
        unzip -q /tmp/cmdline-tools.zip -d /tmp
        mv /tmp/cmdline-tools "$CMDLINE_TOOLS_DIR"
    fi
    
    # Set up environment variables temporarily
    export ANDROID_HOME="$ANDROID_SDK_DIR"
    export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"
    export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
    
    # Accept licenses
    log_progress "Accepting Android SDK licenses..."
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    
    # Install required SDK components
    log_progress "Installing Android SDK components..."
    sdkmanager --install \
        "platform-tools" \
        "platforms;android-34" \
        "build-tools;34.0.0" \
        "system-images;android-34;google_apis_playstore;x86_64" \
        "emulator" \
        --channel=0
    
    # Verify installation
    log_progress "Verifying installation..."
    local required_components=(
        "platform-tools"
        "platforms/android-34"
        "build-tools/34.0.0"
        "system-images/android-34/google_apis_playstore/x86_64"
        "emulator"
    )
    
    local missing_components=()
    for component in "${required_components[@]}"; do
        if [ ! -d "$ANDROID_SDK_DIR/$component" ]; then
            missing_components+=("$component")
        fi
    done
    
    if [ ${#missing_components[@]} -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install components: ${missing_components[*]}${NC}"
        return 1
    fi
    
    log_progress "Android SDK setup completed successfully"
    return 0
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if setup_android_sdk; then
        echo -e "${GREEN}Android SDK setup successful${NC}"
        exit 0
    else
        echo -e "${RED}Android SDK setup failed${NC}"
        exit 1
    fi
fi 