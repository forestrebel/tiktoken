#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Exit on error
set -e

# Load environment variables
ENV_FILE="$(dirname "$(dirname "$0")")/.env"
if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}Loading environment from $ENV_FILE${NC}"
  set -a
  source "$ENV_FILE"
  set +a
else
  echo -e "${RED}Environment file not found. Please run:${NC}"
  echo -e "${GREEN}./scripts/setup-env.sh${NC}"
  exit 1
fi

# Ensure setup-env.sh is executable
SETUP_ENV="$(dirname "$0")/setup-env.sh"
if [ ! -x "$SETUP_ENV" ]; then
  chmod +x "$SETUP_ENV"
fi

# Check if environment is properly set up
if [ ! -d "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME/emulator" ]; then
  echo -e "${RED}Android environment not properly set up. Running setup script...${NC}"
  "$SETUP_ENV"
  # Re-source environment variables after setup
  source "$ENV_FILE"
fi

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
  
  # Kill any existing emulator processes
  pkill -f "emulator" 2>/dev/null || true
  
  # Kill Metro bundler
  pkill -f "react-native start" 2>/dev/null || true
  kill_process $METRO_PID
  
  # Kill ADB server
  adb kill-server 2>/dev/null || true
  
  # Clean up temp files
  rm -rf $TMPDIR/metro-* 2>/dev/null || true
  
  # Clean up any stale lock files
  rm -rf app/android/.gradle/lockfiles/* 2>/dev/null || true
  rm -rf app/android/.gradle/*.lock 2>/dev/null || true
  
  # Remove log files
  rm -f app/metro.log 2>/dev/null || true
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Function to check Android environment
check_android_env() {
  if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}Error: ANDROID_HOME environment variable not set${NC}"
    return 1
  fi

  # Check if emulator exists
  if ! command -v $ANDROID_HOME/emulator/emulator &> /dev/null; then
    echo -e "${RED}Error: Android emulator not found${NC}"
    return 1
  fi

  # Get available AVDs
  local avds=$($ANDROID_HOME/emulator/emulator -list-avds)
  if [ -z "$avds" ]; then
    echo -e "${RED}Error: No Android Virtual Devices (AVDs) found${NC}"
    echo -e "${YELLOW}Please create an AVD using Android Studio first${NC}"
    return 1
  fi

  # Use first available AVD if Pixel7Pro doesn't exist
  if ! echo "$avds" | grep -q "Pixel7Pro"; then
    AVD_NAME=$(echo "$avds" | head -n 1)
    echo -e "${YELLOW}Warning: Pixel7Pro AVD not found, using $AVD_NAME instead${NC}"
  else
    AVD_NAME="Pixel7Pro"
  fi

  return 0
}

# Function to setup assets
setup_assets() {
  echo -e "${GREEN}Setting up assets...${NC}"
  cd app || exit 1
  
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
    echo -e "${RED}Error: demo1.mp4 not found in src/assets/${NC}"
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
  return 0
}

# Function to wait for emulator boot
wait_for_emulator() {
  local timeout=180
  local start_time=$(date +%s)
  
  echo -e "${GREEN}Waiting for emulator to boot...${NC}"
  adb wait-for-device
  
  echo -e "${GREEN}Waiting for system boot completion...${NC}"
  while true; do
    if adb shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
      echo -e "${GREEN}Emulator boot completed${NC}"
      return 0
    fi
    
    local current_time=$(date +%s)
    if [ $((current_time - start_time)) -gt $timeout ]; then
      echo -e "${RED}Error: Emulator boot timeout after ${timeout}s${NC}"
      return 1
    fi
    
    sleep 2
  done
}

# Function to copy demo video to device storage
copy_demo_to_device() {
  echo -e "${GREEN}Copying demo video to device storage...${NC}"
  
  # Wait for device to be ready
  adb wait-for-device
  
  # Create necessary directories on device
  adb shell "mkdir -p /storage/emulated/0/Android/data/com.tiktoken/files/videos"
  adb shell "mkdir -p /storage/emulated/0/Android/data/com.tiktoken/files/thumbnails"
  
  # Copy demo video to device
  adb push app/src/assets/demo1.mp4 /storage/emulated/0/Android/data/com.tiktoken/files/videos/
  
  # Verify copy was successful
  if adb shell "ls /storage/emulated/0/Android/data/com.tiktoken/files/videos/demo1.mp4" > /dev/null 2>&1; then
    echo -e "${GREEN}Demo video copied successfully${NC}"
    return 0
  else
    echo -e "${RED}Failed to copy demo video to device${NC}"
    return 1
  fi
}

# Function to wait for Metro
wait_for_metro() {
  local timeout=60
  local start_time=$(date +%s)
  
  echo -e "${GREEN}Waiting for Metro bundler...${NC}"
  while true; do
    if grep -q "Metro waiting on" "$METRO_LOG" 2>/dev/null; then
      echo -e "${GREEN}Metro bundler is ready${NC}"
      return 0
    fi
    
    local current_time=$(date +%s)
    if [ $((current_time - start_time)) -gt $timeout ]; then
      echo -e "${RED}Error: Metro bundler timeout after ${timeout}s${NC}"
      return 1
    fi
    
    sleep 2
  done
}

# Main setup function
setup_demo() {
  echo -e "${YELLOW}Setting up demo environment...${NC}"

  # Check Android environment
  if ! check_android_env; then
    exit 1
  fi

  # Initial cleanup
  cleanup
  
  # Setup assets first
  if ! setup_assets; then
    echo -e "${RED}Failed to setup assets${NC}"
    exit 1
  fi

  # Start emulator in background with improved settings
  echo -e "${GREEN}Starting emulator...${NC}"
  $ANDROID_HOME/emulator/emulator -avd "$AVD_NAME" \
    -no-snapshot-load \
    -no-boot-anim \
    -gpu swiftshader_indirect \
    -accel on \
    -wipe-data \
    -no-audio \
    -read-only &
  EMULATOR_PID=$!

  # Wait for emulator to boot
  if ! wait_for_emulator; then
    echo -e "${RED}Failed to start emulator${NC}"
    exit 1
  fi

  # Start Metro bundler in background with clean cache
  echo -e "${GREEN}Starting Metro bundler...${NC}"
  cd app || exit 1
  METRO_LOG="metro.log"
  npx react-native start --reset-cache --no-interactive > "$METRO_LOG" 2>&1 &
  METRO_PID=$!

  # Wait for Metro to be ready
  if ! wait_for_metro; then
    echo -e "${RED}Failed to start Metro bundler${NC}"
    exit 1
  fi

  # Install and run the app
  echo -e "${GREEN}Installing and running the app...${NC}"
  if ! npx react-native run-android --active-arch-only --mode=debug --no-packager; then
    echo -e "${RED}Failed to install the app${NC}"
    exit 1
  fi

  # Copy demo video to device storage
  if ! copy_demo_to_device; then
    echo -e "${RED}Failed to copy demo video${NC}"
    exit 1
  fi

  echo -e "${GREEN}Demo environment is ready!${NC}"
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