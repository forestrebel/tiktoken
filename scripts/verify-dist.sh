#!/bin/bash
# Verify APK distribution

echo "🔍 Checking distribution..."

# 1. Verify configs exist
if [[ ! -f "firebase.json" ]]; then
  echo "❌ firebase.json missing"
  exit 1
fi

if [[ ! -f "app/android/app/build.gradle" ]]; then
  echo "❌ build.gradle missing"
  exit 1
fi

# 2. Verify package name in build.gradle
if ! grep -q "applicationId \"com.tiktoken\"" "app/android/app/build.gradle"; then
  echo "❌ Incorrect package name in build.gradle"
  exit 1
fi

# 3. Verify Firebase app ID in firebase.json
if ! grep -q "1:785506674013:android:13b7bc99b37487284874b4" "firebase.json"; then
  echo "❌ Incorrect Firebase app ID"
  exit 1
fi

# 4. Verify APK builds
if ! make apk.build; then
  echo "❌ APK build failed"
  exit 1
fi

# 5. Try distribution
if ! make dist.fast; then
  echo "❌ Distribution failed"
  exit 1
fi

echo "✅ Distribution verified" 