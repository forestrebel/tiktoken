#!/bin/bash

# Source environment variables
source .env

# Wait for device to be ready
adb wait-for-device

# Enable dark theme
echo "Setting dark theme..."
adb shell settings put secure ui_night_mode 2

# Set screen timeout to 30 minutes (30 * 60 * 1000 ms)
echo "Setting screen timeout..."
adb shell settings put system screen_off_timeout 1800000

# Keep screen on while charging
echo "Enabling stay awake..."
adb shell settings put global stay_on_while_plugged_in 3

# Optional: Set animation scales to 0.5 for better performance
echo "Optimizing animations..."
adb shell settings put global window_animation_scale 0.5
adb shell settings put global transition_animation_scale 0.5
adb shell settings put global animator_duration_scale 0.5

echo "Emulator configuration complete!" 