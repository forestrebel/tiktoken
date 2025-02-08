#!/bin/bash

# Check for quick mode
QUICK_MODE=0
if [ "$1" = "--quick" ]; then
    QUICK_MODE=1
fi

# Safety check for project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from project root"
    exit 1
fi

# Define cache directories
METRO_CACHE_PATTERNS=(
    "metro-*"
    "metro-cache-*"
    "react-*"
    "haste-map-*"
    "metro-symbolicate*"
)

NPM_CACHE_DIRS=(
    "$HOME/.npm/_cacache"
    "node_modules"
)

RN_CACHE_DIRS=(
    "$HOME/Library/Developer/Xcode/DerivedData"
    "$HOME/.gradle/caches"
    "$TMPDIR/react-native-packager-cache-*"
    "$TMPDIR/metro-*"
)

VIDEO_CACHE_DIRS=(
    "$HOME/Library/Caches/Videos"
    "$HOME/.cache/Videos"
    "/tmp/Videos"
    "/var/tmp/Videos"
    "android/app/src/main/assets/videos"
    "android/app/src/main/res/raw"
    "src/assets/demo"
)

BUILD_DIRS=(
    "android/app/build"
    "android/.gradle"
    "android/build"
)

echo "🧹 Cleaning up environment..."

# 1. Kill any running Metro/React Native processes
echo "Stopping Metro and React Native processes..."
pkill -f "react-native" || true
pkill -f "metro" || true

# 2. Clear watchman watches if installed
if command -v watchman &> /dev/null; then
    echo "Clearing Watchman watches..."
    watchman watch-del-all || true
fi

# 3. Clean Metro cache
echo "Cleaning Metro cache..."
for pattern in "${METRO_CACHE_PATTERNS[@]}"; do
    rm -rf "$TMPDIR/$pattern" 2>/dev/null || true
done

# 4. Clean video caches
echo "Cleaning video caches..."
for dir in "${VIDEO_CACHE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "Cleaning $dir..."
        rm -rf "$dir"/* 2>/dev/null || true
    fi
done

if [ $QUICK_MODE -eq 0 ]; then
    # 5. Clean npm cache
    echo "Cleaning npm cache..."
    for dir in "${NPM_CACHE_DIRS[@]}"; do
        rm -rf "$dir" 2>/dev/null || true
    done
    npm cache clean --force

    # 6. Clean React Native caches
    echo "Cleaning React Native caches..."
    for dir in "${RN_CACHE_DIRS[@]}"; do
        rm -rf "$dir" 2>/dev/null || true
    done

    # 7. Clean build directories
    echo "Cleaning build directories..."
    if [ -d "android" ]; then
        cd android
        ./gradlew clean
        cd ..
        for dir in "${BUILD_DIRS[@]}"; do
            rm -rf "$dir" 2>/dev/null || true
        done
    fi

    # 8. Reinstall dependencies
    echo "Reinstalling dependencies..."
    npm install
fi

# 9. Verify and create critical directories
echo "Verifying directory structure..."
DIRS_TO_CREATE=(
    "src/assets/demo"
    "android/app/src/main/assets/videos"
    "android/app/src/main/res/raw"
    "android/app/src/main/assets"
)

for dir in "${DIRS_TO_CREATE[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "Creating $dir..."
        mkdir -p "$dir"
        touch "$dir/.gitkeep"
    fi
done

if [ $QUICK_MODE -eq 1 ]; then
    echo "✨ Quick cleanup complete!"
else
    echo "✨ Full cleanup complete!"
fi 