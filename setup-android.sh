#!/bin/bash

# Android SDK
export ANDROID_HOME=/home/jon/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Start Metro bundler
echo "Starting Metro bundler..."
npm start &

# Wait for Metro to start
sleep 5

# Start emulator
echo "Starting emulator..."
$ANDROID_HOME/emulator/emulator -avd Pixel_7_Pro_API_34 &

# Wait for emulator
echo "Waiting for emulator to boot..."
$ANDROID_HOME/platform-tools/adb wait-for-device

# Build and install app
echo "Building and installing app..."
npm run android 