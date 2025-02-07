#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if a process is running
is_running() {
  ps -p $1 > /dev/null 2>&1
  return $?
}

# Function to kill processes safely
kill_process() {
  if [ ! -z "$1" ] && is_running $1; then
    echo -e "${YELLOW}Killing process $1...${NC}"
    kill $1 2>/dev/null || kill -9 $1 2>/dev/null
  fi
}

# Function to clean up processes
cleanup() {
  echo -e "${YELLOW}Cleaning up processes...${NC}"
  kill_process $METRO_PID
  kill_process $EMULATOR_PID
  pkill -f "emulator" 
  adb kill-server
  rm -rf $TMPDIR/metro-* 2>/dev/null
}

# Trap cleanup on script exit
trap cleanup EXIT

# Function to setup assets
setup_assets() {
  echo -e "${GREEN}Setting up assets...${NC}"
  cd app
  
  # Clear all caches
  rm -rf android/app/build
  rm -rf android/.gradle
  rm -rf $TMPDIR/metro-*
  
  # Ensure asset directories exist
  mkdir -p "android/app/src/main/assets"
  mkdir -p "android/app/src/main/res/raw"
  mkdir -p "src/assets"
  
  # Check if demo video exists in source assets
  if [ ! -f "src/assets/demo1.mp4" ]; then
    echo -e "${RED}Warning: demo1.mp4 not found in src/assets/${NC}"
    return 1
  fi
  
  # Copy assets to Android directories
  echo -e "${GREEN}Copying demo videos to Android...${NC}"
  cp -f src/assets/demo1.mp4 "android/app/src/main/res/raw/"
  cp -f src/assets/demo1.mp4 "android/app/src/main/assets/"
  
  # Create assets bundle
  echo -e "${GREEN}Creating Android bundle...${NC}"
  npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
  
  # Verify assets were copied correctly
  if [ ! -f "android/app/src/main/res/raw/demo1.mp4" ] || [ ! -f "android/app/src/main/assets/demo1.mp4" ]; then
    echo -e "${RED}Failed to copy demo videos${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Assets setup complete${NC}"
  cd ..
}

# Function for fast reset
fast_reset() {
  echo -e "${YELLOW}Fast resetting the app...${NC}"
  cd app
  
  # Clear Metro bundler cache
  rm -rf $TMPDIR/metro-* 2>/dev/null
  
  # Kill and restart Metro bundler
  kill_process $METRO_PID
  npx react-native start --reset-cache --no-interactive &
  METRO_PID=$!
  
  # Clear app data and restart
  adb shell pm clear com.tiktoken
  npx react-native run-android --active-arch-only --mode=debug --no-packager
  
  echo -e "${GREEN}App has been reset!${NC}"
  echo -e "${YELLOW}Metro bundler PID: ${METRO_PID}${NC}"
}

# Main setup function
setup_demo() {
  echo -e "${YELLOW}Setting up demo environment...${NC}"

  # Initial cleanup
  cleanup
  
  # Setup assets first
  setup_assets

  # Start emulator in background
  echo -e "${GREEN}Starting emulator...${NC}"
  $ANDROID_HOME/emulator/emulator -avd Pixel7Pro -no-snapshot-load -no-boot-anim -gpu host -accel on -wipe-data &
  EMULATOR_PID=$!

  # Wait for emulator to boot
  echo -e "${GREEN}Waiting for emulator to boot...${NC}"
  adb wait-for-device
  
  # Additional boot completion check
  echo -e "${GREEN}Waiting for system boot completion...${NC}"
  adb shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'

  # Start Metro bundler in background with clean cache
  echo -e "${GREEN}Starting Metro bundler...${NC}"
  cd app
  npx react-native start --reset-cache --no-interactive &
  METRO_PID=$!

  # Install and run the app
  echo -e "${GREEN}Installing and running the app...${NC}"
  npx react-native run-android --active-arch-only --mode=debug --no-packager

  echo -e "${YELLOW}Demo environment is ready!${NC}"
  echo -e "${GREEN}Metro bundler PID: ${METRO_PID}${NC}"
  echo -e "${GREEN}Emulator PID: ${EMULATOR_PID}${NC}"
  echo -e "${YELLOW}Commands available:${NC}"
  echo -e "  ${GREEN}./scripts/demo.sh reset${NC} - Fast reset the app"
  echo -e "  ${GREEN}kill $METRO_PID $EMULATOR_PID${NC} - Clean up all processes"
}

# Command line argument handling
case "$1" in
  "reset")
    fast_reset
    ;;
  *)
    setup_demo
    ;;
esac 