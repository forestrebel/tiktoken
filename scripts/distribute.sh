#!/bin/bash
set -e

echo "📦 Building release APK..."
cd android && ./gradlew assembleRelease

echo "🚀 Distributing to Firebase..."
firebase appdistribution:distribute \
  app/build/outputs/apk/release/app-release.apk \
  --app 1:785506674013:android:13b7bc99b37487284874b4 \
  --testers ashalesh.tilawat@bloomtech.com

echo "✅ Distribution complete" 