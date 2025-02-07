#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Exit on error
set -e

echo -e "${YELLOW}Setting up development environment...${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to install packages using apt-get
install_package() {
  if ! command_exists $1; then
    echo -e "${YELLOW}Installing $1...${NC}"
    sudo apt-get update && sudo apt-get install -y $1
  fi
}

# Install required packages
install_package "openjdk-11-jdk"
install_package "adb"
install_package "gradle"

# Create Android SDK directory if it doesn't exist
ANDROID_DIR="$HOME/Android"
ANDROID_SDK_DIR="$ANDROID_DIR/Sdk"
mkdir -p "$ANDROID_SDK_DIR"

# Install Android command line tools if not present
CMDLINE_TOOLS_DIR="$ANDROID_SDK_DIR/cmdline-tools/latest"
if [ ! -d "$CMDLINE_TOOLS_DIR" ]; then
  echo -e "${YELLOW}Installing Android command line tools...${NC}"
  TEMP_DIR=$(mktemp -d)
  wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -P "$TEMP_DIR"
  mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
  unzip "$TEMP_DIR/commandlinetools-linux-9477386_latest.zip" -d "$TEMP_DIR"
  mv "$TEMP_DIR/cmdline-tools" "$ANDROID_SDK_DIR/cmdline-tools/latest"
  rm -rf "$TEMP_DIR"
fi

# Create or update .env file
ENV_FILE=".env"
cat > "$ENV_FILE" << EOL
# Android SDK paths
ANDROID_HOME=$ANDROID_SDK_DIR
ANDROID_SDK_ROOT=$ANDROID_SDK_DIR

# Add Android tools to PATH
PATH=\$PATH:\$ANDROID_HOME/emulator
PATH=\$PATH:\$ANDROID_HOME/platform-tools
PATH=\$PATH:\$ANDROID_HOME/tools
PATH=\$PATH:\$ANDROID_HOME/tools/bin
PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin

# Java home
JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
EOL

# Source the environment variables
source "$ENV_FILE"

# Accept Android SDK licenses
yes | sdkmanager --licenses >/dev/null 2>&1 || true

# Install required Android SDK components
echo -e "${YELLOW}Installing Android SDK components...${NC}"
sdkmanager --install \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "system-images;android-34;google_apis_playstore;x86_64" \
    "emulator" \
    --channel=0

# Create Pixel7Pro AVD if it doesn't exist
if ! avdmanager list avd | grep -q "Pixel7Pro"; then
  echo -e "${YELLOW}Creating Pixel7Pro AVD...${NC}"
  echo "no" | avdmanager create avd \
    --name "Pixel7Pro" \
    --package "system-images;android-34;google_apis_playstore;x86_64" \
    --device "pixel_7_pro"
fi

# Add environment setup to shell rc file
RC_FILE="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
  RC_FILE="$HOME/.zshrc"
fi

# Remove any existing Android environment setup
sed -i '/# Android environment setup/,/# End Android environment setup/d' "$RC_FILE"

# Add new environment setup
cat >> "$RC_FILE" << 'EOL'

# Android environment setup
if [ -f "$HOME/git/tiktoken/.env" ]; then
  set -a
  source "$HOME/git/tiktoken/.env"
  set +a
fi
# End Android environment setup
EOL

echo -e "${GREEN}Environment setup complete!${NC}"
echo -e "${YELLOW}Please restart your terminal or run:${NC}"
echo -e "${GREEN}source $RC_FILE${NC}" 