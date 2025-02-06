#!/bin/bash

# Exit on error
set -e

echo "Setting up Waydroid for TikToken development..."

# Install dependencies
sudo apt update
sudo apt install -y \
  curl \
  ca-certificates \
  waydroid \
  python3 \
  python3-pip \
  adb \
  android-tools-adb

# Initialize Waydroid
sudo waydroid init

# Start Waydroid container
sudo systemctl start waydroid-container

# Wait for container
sleep 5

# Start Waydroid session
waydroid session start &

# Wait for session
sleep 10

# Install development tools
waydroid app install com.android.development

# Setup ADB
adb connect 192.168.240.112

# Show status
echo "Waydroid Status:"
waydroid status

echo "
Setup complete! To use:
1. Start Waydroid:    waydroid session start
2. Connect ADB:       adb connect 192.168.240.112
3. List devices:      adb devices
4. Install app:       cd tiktoken-creator && npm run android
5. View logs:         adb logcat *:E ReactNative:V ReactNativeJS:V

To stop Waydroid:
1. Stop session:      waydroid session stop
2. Stop container:    sudo systemctl stop waydroid-container
"
