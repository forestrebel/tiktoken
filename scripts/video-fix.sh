#!/bin/bash

echo "🎥 Fixing video playback issues..."

# 1. Kill relevant processes
echo "Stopping video-related processes..."
pkill -f "react-native" || true
pkill -f "metro" || true

# 2. Clean Metro cache (most common video playback issue)
echo "Cleaning Metro cache..."
METRO_PATTERNS=(
    "metro-*"
    "metro-cache-*"
    "react-native-packager-cache-*"
    "metro-symbolicate*"
)

for pattern in "${METRO_PATTERNS[@]}"; do
    rm -rf "/tmp/$pattern" 2>/dev/null || true
done

# 3. Clean video-specific caches
echo "Cleaning video caches..."
VIDEO_PATHS=(
    "$HOME/Library/Caches/Videos"
    "$HOME/.cache/Videos"
    "/tmp/Videos"
    "/var/tmp/Videos"
    "android/app/src/main/assets/videos"
    "android/app/src/main/res/raw"
    "src/assets/demo"
)

for path in "${VIDEO_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "Cleaning $path..."
        rm -rf "$path"/* 2>/dev/null || true
    fi
done

# 4. Verify and recreate video directories
echo "Verifying video directories..."
VIDEO_DIRS=(
    "src/assets/demo"
    "android/app/src/main/assets/videos"
    "android/app/src/main/res/raw"
)

for dir in "${VIDEO_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "Creating $dir..."
        mkdir -p "$dir"
    fi
    touch "$dir/.gitkeep"
done

# 5. Reset Metro bundler
echo "Resetting Metro bundler..."
rm -rf $TMPDIR/metro-cache
rm -rf $TMPDIR/haste-map-metro-*

echo "✨ Video cleanup complete! Next steps:"
echo "1. Run: npm start -- --reset-cache"
echo "2. In another terminal, run: npm run android (or ios)"
echo "3. If issues persist, run: make clean.all" 