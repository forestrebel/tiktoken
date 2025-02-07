#!/bin/bash

echo "🔍 Verifying Firebase setup..."

# 1. Check project
if ! firebase projects:list | grep "(current)" > /dev/null; then
  echo "❌ No active project"
  echo "Run: firebase use forestrebel-tiktoken"
  exit 1
fi

# 2. Build APK
if ! make apk.build; then
  echo "❌ APK build failed"
  exit 1
fi

# 3. Distribute to grader
if ! firebase appdistribution:distribute \
  app/android/app/build/outputs/apk/release/app-release.apk \
  --app 1:785506674013:android:13b7bc99b37487284874b4 \
  --testers ashalesh.tilawat@bloomtech.com \
  --release-notes "Build for grading - Valid for 7 days"; then
  echo "❌ Distribution failed"
  exit 1
fi

echo "✅ Firebase setup verified" 