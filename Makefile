# Core variables
APP_DIR := .
ANDROID_HOME ?= $(HOME)/Android/Sdk
SCRIPTS_DIR := scripts
TMPDIR ?= /tmp

# Add explicit paths for Node
NODE_PATH := /usr/bin
export PATH := $(NODE_PATH):$(PATH)

# Cache patterns (enhanced for video playback)
METRO_PATTERNS := \
	/tmp/metro-* \
	/tmp/metro-cache-* \
	/tmp/react-* \
	/tmp/haste-map-* \
	/tmp/metro-symbolicate* \
	$(HOME)/.cache/metro-* \
	$(HOME)/.cache/react-native-* \
	$(HOME)/.cache/react-native-packager-* \
	$(HOME)/.cache/babel-loader-*

# Video paths (enhanced with additional caches)
VIDEO_CACHE_PATHS := \
	$(HOME)/.cache/Videos \
	/tmp/Videos \
	/var/tmp/Videos \
	src/assets/videos \
	src/assets/demo \
	android/app/src/main/assets/videos \
	android/app/src/main/res/raw \
	$(HOME)/.cache/react-native-video/* \
	$(HOME)/.cache/ExoPlayer/*

# Project-specific video directories
VIDEO_DIRS := \
	src/assets/videos \
	src/assets/demo \
	android/app/src/main/assets/videos \
	android/app/src/main/res/raw \
	android/app/src/main/assets

# Build artifacts
BUILD_PATHS := \
	android/app/build \
	android/.gradle \
	android/build \
	node_modules \
	/tmp/react-native-* \
	/tmp/haste-map-react-native-packager-* \
	$(HOME)/.gradle/caches/transforms-*

# Colors for output
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m

# Test configuration
TEST_OUTPUT_DIR := test-results
JEST_FLAGS := --silent --colors --config=jest.config.js

# Process management
REACT_PROCESSES := react-native|metro|watchman|adb
EXOPLAYER_PROCESSES := exoplayer|mediaserver

# Main targets
.PHONY: test test.clean test.setup test.minimal clean clean.video clean.all start.dev verify.env verify.dirs clean.cache fix.video fix.video.basic fix.video.minimal

# Primary test entry point - only run minimal tests by default
test: test.clean test.setup test.minimal
	@echo "$(GREEN)Tests completed$(NC)"

# Clean test environment
test.clean:
	@echo "$(GREEN)Cleaning test environment...$(NC)"
	@rm -rf $(TEST_OUTPUT_DIR)
	@mkdir -p $(TEST_OUTPUT_DIR)
	@pkill -f "metro" || true

# Set up test environment
test.setup: verify.env
	@echo "$(GREEN)Setting up test environment...$(NC)"
	@cd $(APP_DIR) && npm install

# Environment validation
verify.env:
	@echo "$(GREEN)Verifying environment...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)node is required$(NC)" >&2; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required$(NC)" >&2; exit 1; }
	@test -f "package.json" || { echo "$(RED)Must be run from project root$(NC)" >&2; exit 1; }
	@echo "$(GREEN)Environment check passed$(NC)"

# Directory structure verification
verify.dirs:
	@echo "$(GREEN)Verifying directory structure...$(NC)"
	@for dir in $(VIDEO_DIRS); do \
		if ! mkdir -p $$dir 2>/dev/null; then \
			echo "$(RED)Failed to create directory: $$dir$(NC)" >&2; \
			exit 1; \
		fi; \
		if ! touch $$dir/.gitkeep 2>/dev/null; then \
			echo "$(RED)Failed to create .gitkeep in: $$dir$(NC)" >&2; \
			exit 1; \
		fi; \
	done

# Minimal test runner
test.minimal:
	@echo "$(GREEN)Running minimal tests...$(NC)"
	@cd $(APP_DIR) && npm run test:minimal $(JEST_FLAGS)

# Development convenience target
.PHONY: test.watch
test.watch:
	@echo "$(GREEN)Starting test watcher...$(NC)"
	@cd $(APP_DIR) && npm test -- --watch $(JEST_FLAGS)

# Cache cleanup
clean.cache:
	@echo "$(GREEN)Cleaning cache directories...$(NC)"
	@echo "Cleaning Metro cache..."
	@rm -rf $(METRO_PATTERNS) 2>/dev/null || true
	@echo "Cleaning npm cache..."
	@rm -rf $(HOME)/.npm/_cacache
	@npm cache clean --force
	@echo "Cleaning Gradle cache..."
	@rm -rf $(HOME)/.gradle/caches
	@echo "$(GREEN)Cache cleanup completed$(NC)"

# Quick development cleanup
clean.quick: verify.env verify.dirs
	@echo "$(GREEN)Quick cleanup for development...$(NC)"
	@pkill -f "react-native" || true
	@pkill -f "metro" || true
	@rm -rf $(METRO_PATTERNS) 2>/dev/null || true
	@echo "$(GREEN)Quick cleanup completed$(NC)"

# Full cleanup
clean.all: verify.env
	@echo "$(GREEN)Running complete system reset...$(NC)"
	# Kill all processes
	@pkill -f "react-native" || true
	@pkill -f "metro" || true
	# Clean all caches
	@echo "Cleaning all caches..."
	@for pattern in $(METRO_PATTERNS); do \
		rm -rf $$pattern 2>/dev/null || true; \
	done
	@for path in $(VIDEO_CACHE_PATHS); do \
		if [ -d "$$path" ]; then \
			rm -rf "$$path"/* 2>/dev/null || true; \
		fi; \
	done
	# Clean build artifacts
	@echo "Cleaning build artifacts..."
	@for path in $(BUILD_PATHS); do \
		rm -rf $$path 2>/dev/null || true; \
	done
	# Clean Android build
	@if [ -d "android" ]; then \
		cd android && ./gradlew clean && cd ..; \
	fi
	# Clean npm cache
	@echo "Cleaning npm cache..."
	@npm cache clean --force
	@rm -rf $(HOME)/.npm/_cacache
	# Reinstall dependencies
	@echo "Reinstalling dependencies..."
	@npm install
	# Reset directories
	@echo "Resetting directory structure..."
	@for dir in $(VIDEO_DIRS); do \
		mkdir -p $$dir; \
		touch $$dir/.gitkeep; \
	done
	@echo "$(GREEN)Complete reset finished$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "1. Run: npm start -- --reset-cache"
	@echo "2. In another terminal: npm run android"

# Development startup
start.dev: verify.env verify.dirs clean.quick
	@echo "$(GREEN)Starting development server...$(NC)"
	@npm start -- --reset-cache

# Complexity prevention
complexity-check:
	@echo "$(GREEN)Checking frontend complexity...$(NC)"
	@if [ $$(find . -name "*.test.js" | wc -l) -gt 10 ]; then \
		echo "$(RED)Too many test files! Keep it minimal...$(NC)" >&2; \
		exit 1; \
	fi
	@if [ $$(npm ls | wc -l) -gt 20 ]; then \
		echo "$(RED)Too many dependencies! Stay lean...$(NC)" >&2; \
		exit 1; \
	fi
	@echo "$(GREEN)Frontend checks passed!$(NC)"

# Cleanup targets
clean: verify.env
	@echo "$(GREEN)Running basic cleanup...$(NC)"
	@pkill -f "react-native" || true
	@pkill -f "metro" || true
	@rm -rf node_modules
	@rm -rf $(HOME)/.npm/_cacache
	@npm cache clean --force
	@if [ -d "android" ]; then \
		cd android && ./gradlew clean; \
		cd .. && rm -rf android/app/build android/.gradle android/build; \
	fi
	@npm install

clean.video: verify.env verify.dirs
	@echo "$(GREEN)Cleaning video-related files and caches...$(NC)"
	# Clean video caches
	@for path in $(VIDEO_CACHE_PATHS); do \
		if [ -d "$$path" ]; then \
			echo "Cleaning $$path..."; \
			rm -rf "$$path"/* 2>/dev/null || true; \
		fi; \
	done
	# Preserve directory structure
	@for dir in $(VIDEO_DIRS); do \
		mkdir -p $$dir; \
		touch $$dir/.gitkeep; \
	done
	@echo "$(GREEN)Video cleanup completed$(NC)"

# Enhanced fix.video target
fix.video: verify.env verify.dirs
	@echo "$(GREEN)Running enhanced video playback fix...$(NC)"
	# Kill processes more thoroughly
	@echo "Stopping all related processes..."
	@pkill -f "$(REACT_PROCESSES)" || true
	@pkill -f "$(EXOPLAYER_PROCESSES)" || true
	@sleep 2  # Give processes time to fully terminate
	
	# Clean Metro cache with verification
	@echo "Cleaning Metro and React Native caches..."
	@for pattern in $(METRO_PATTERNS); do \
		if ls $$pattern 1> /dev/null 2>&1; then \
			echo "Removing cache: $$pattern"; \
			rm -rf $$pattern; \
		fi \
	done
	
	# Reset video directories with permissions fix
	@echo "Resetting video directories..."
	@for dir in $(VIDEO_DIRS); do \
		if [ -d "$$dir" ]; then \
			echo "Cleaning $$dir..."; \
			find "$$dir" -type f ! -name '.gitkeep' -delete; \
			chmod -R 755 "$$dir" 2>/dev/null || true; \
		else \
			echo "Creating $$dir..."; \
			mkdir -p "$$dir"; \
			chmod 755 "$$dir" 2>/dev/null || true; \
		fi; \
		touch "$$dir/.gitkeep"; \
	done
	
	# Clean video-specific caches
	@echo "Cleaning video caches..."
	@for path in $(VIDEO_CACHE_PATHS); do \
		if [ -d "$$path" ]; then \
			echo "Cleaning $$path..."; \
			find "$$path" -type f ! -name '.gitkeep' -delete 2>/dev/null || true; \
		fi \
	done
	
	# Reset Android media cache
	@if [ -d "android" ]; then \
		echo "Cleaning Android media cache..."; \
		rm -rf android/app/src/main/assets/videos/* 2>/dev/null || true; \
		rm -rf android/app/src/main/res/raw/* 2>/dev/null || true; \
		find android/app/build/intermediates -type d -name "exoplayer" -exec rm -rf {} + 2>/dev/null || true; \
	fi
	
	# Verify permissions
	@echo "Verifying permissions..."
	@for dir in $(VIDEO_DIRS); do \
		chmod -R 755 "$$dir" 2>/dev/null || true; \
	done
	
	# Clean temporary caches with verification
	@echo "Cleaning temporary caches..."
	@rm -rf /tmp/react-native-packager-cache-* 2>/dev/null || true
	@rm -rf /tmp/metro-bundler-cache-* 2>/dev/null || true
	@rm -rf /tmp/react-native-video-cache-* 2>/dev/null || true
	
	# Restart ADB server for Android
	@if command -v adb >/dev/null 2>&1; then \
		echo "Restarting ADB server..."; \
		adb kill-server; \
		adb start-server; \
	fi
	
	@echo "$(GREEN)Video playback fix completed$(NC)"
	@echo "$(YELLOW)Starting Metro bundler with clean cache...$(NC)"
	@npm start -- --reset-cache

# Minimal video fix for testing
fix.video.basic: verify.env
	@echo "$(GREEN)Running minimal video fix...$(NC)"
	# 1. Stop Metro only (most common issue)
	@echo "Stopping Metro bundler..."
	@pkill -f "metro" || true
	@sleep 1
	
	# 2. Clean only essential caches
	@echo "Cleaning essential caches..."
	@rm -rf /tmp/metro-cache* 2>/dev/null || true
	@rm -rf /tmp/metro-bundler* 2>/dev/null || true
	@rm -rf $(HOME)/.cache/metro-* 2>/dev/null || true
	
	# 3. Verify video assets directory
	@echo "Checking video directories..."
	@mkdir -p src/assets/demo
	@mkdir -p android/app/src/main/assets/videos
	
	@echo "$(GREEN)Basic fix completed$(NC)"
	@echo "$(YELLOW)Starting Metro bundler...$(NC)"
	@npm start -- --reset-cache

# Super minimal video fix for testing
fix.video.minimal: verify.env
	@echo "$(GREEN)Running super minimal video fix...$(NC)"
	
	# 1. Check Metro status
	@if pgrep -f "metro" > /dev/null; then \
		echo "Stopping Metro bundler..."; \
		pkill -f "metro" || true; \
		sleep 1; \
	else \
		echo "Metro not running, proceeding..."; \
	fi
	
	# 2. Clean only Metro cache
	@echo "Cleaning Metro cache..."
	@if [ -d "/tmp/metro-cache" ]; then \
		rm -rf /tmp/metro-cache*; \
		echo "Cleaned Metro cache"; \
	else \
		echo "No Metro cache found"; \
	fi
	
	# 3. Verify demo video directory
	@echo "Checking demo video directory..."
	@mkdir -p src/assets/demo
	@echo "$(GREEN)Directory check complete$(NC)"
	
	# 4. Start fresh Metro instance
	@echo "$(YELLOW)Starting fresh Metro bundler...$(NC)"
	@FORCE_BUNDLING=true npm start -- --reset-cache 

# Separate cleanup and start targets for testing
clean.metro:
	@echo "$(GREEN)Cleaning Metro cache only...$(NC)"
	@rm -rf /tmp/metro-cache* 2>/dev/null || true
	@rm -rf /tmp/metro-bundler* 2>/dev/null || true
	@echo "$(GREEN)Metro cache cleaned$(NC)"

clean.video.minimal:
	@echo "$(GREEN)Minimal video cleanup...$(NC)"
	# Create directories
	@mkdir -p src/assets/demo
	@mkdir -p android/app/src/main/assets/videos
	# Copy demo videos to Android assets
	@echo "Copying demo videos to Android assets..."
	@cp -f src/assets/demo/*.mp4 android/app/src/main/assets/videos/ 2>/dev/null || true
	@echo "$(GREEN)Video directories verified and files copied$(NC)"

start.metro.bg:
	@echo "$(YELLOW)Starting Metro bundler in background...$(NC)"
	@FORCE_BUNDLING=true npm start -- --reset-cache &

# Android environment setup
include .env

# Define Android paths
ANDROID_HOME := $(HOME)/Android/Sdk
ANDROID_SDK_ROOT := $(ANDROID_HOME)

# Export Android variables
export ANDROID_HOME
export ANDROID_SDK_ROOT

# Android environment setup helper
define android_shell
	export PATH="$(ANDROID_HOME)/platform-tools:$$PATH" && $(1)
endef

# Android targets
android.check:
	@echo "$(GREEN)Checking Android environment...$(NC)"
	@echo "ANDROID_HOME: $(ANDROID_HOME)"
	@$(call android_shell, \
		echo "PATH: $$PATH" && \
		command -v adb >/dev/null 2>&1 || { echo "$(RED)adb not found. Please install Android SDK platform-tools$(NC)" >&2; exit 1; } && \
		test -d "$(ANDROID_HOME)" || { echo "$(RED)ANDROID_HOME directory not found$(NC)" >&2; exit 1; } && \
		echo "$(GREEN)Android environment check passed!$(NC)" \
	)

android.devices: android.check
	@echo "$(GREEN)Connected devices:$(NC)"
	@$(call android_shell, \
		adb devices && \
		adb shell getprop ro.product.cpu.abi \
	)

android.restart: android.check
	@echo "$(GREEN)Restarting ADB server...$(NC)"
	@$(call android_shell, \
		sudo adb kill-server && \
		sudo adb start-server && \
		adb devices \
	)

android.config: android.check
	@echo "$(GREEN)Configuring emulator settings...$(NC)"
	@$(call android_shell, \
		adb wait-for-device && \
		adb shell settings put secure ui_night_mode 2 && \
		adb shell settings put system screen_off_timeout 1800000 && \
		adb shell settings put global stay_on_while_plugged_in 3 && \
		adb shell settings put global window_animation_scale 0.5 && \
		adb shell settings put global transition_animation_scale 0.5 && \
		adb shell settings put global animator_duration_scale 0.5 \
	)

android.install: android.check
	@echo "$(GREEN)Installing app to device...$(NC)"
	@$(call android_shell, cd android && ./gradlew installDebug --info)

# Update existing targets to use Android checks
start.android: android.check android.devices
	@echo "$(YELLOW)Starting Android app...$(NC)"
	@$(call android_shell, npm run android)

# Combined minimal fix with background Metro
fix.video.test: clean.metro clean.video.minimal start.metro.bg
	@echo "$(GREEN)Cleanup complete. Metro starting in background.$(NC)"
	@echo "$(YELLOW)Wait 5 seconds, then run: make start.android$(NC)"

# Video fix in two steps
video.clean:
	@echo "$(GREEN)Step 1: Cleaning up video environment...$(NC)"
	# Kill only Metro and React Native server processes
	@pgrep -f "metro" | xargs kill -9 2>/dev/null || true
	@pgrep -f "react-native start" | xargs kill -9 2>/dev/null || true
	@sleep 1
	
	# Clean Metro cache
	@echo "Cleaning Metro cache..."
	@rm -rf /tmp/metro-cache* 2>/dev/null || true
	@rm -rf /tmp/metro-bundler* 2>/dev/null || true
	@rm -rf $(HOME)/.cache/metro-* 2>/dev/null || true
	
	# Setup video directories
	@echo "Setting up video directories..."
	@mkdir -p src/assets/demo
	@mkdir -p android/app/src/main/assets/videos
	
	# Copy videos
	@echo "Copying demo videos..."
	@cp -f src/assets/demo/*.mp4 android/app/src/main/assets/videos/ 2>/dev/null || true
	
	@echo "$(GREEN)Cleanup complete!$(NC)"
	@echo "$(YELLOW)Now run these commands in two separate terminals:$(NC)"
	@echo "1. make video.metro  (in terminal 1)"
	@echo "2. make video.android  (in terminal 2)"

video.metro:
	@echo "$(GREEN)Step 2a: Starting Metro bundler...$(NC)"
	npm start -- --reset-cache

video.android:
	@echo "$(GREEN)Step 2b: Starting Android app...$(NC)"
	npm run android

# Remove old targets that were causing issues
.PHONY: video.clean video.metro video.android 

# Minimal video setup (no process killing)
setup.video:
	@echo "$(GREEN)Setting up video environment...$(NC)"
	
	# Clean Metro cache
	@echo "Cleaning Metro cache..."
	@rm -rf /tmp/metro-cache* 2>/dev/null || true
	@rm -rf /tmp/metro-bundler* 2>/dev/null || true
	
	# Setup and verify directories
	@echo "Setting up video directories..."
	@mkdir -p src/assets/demo
	@mkdir -p android/app/src/main/assets/videos
	
	# Copy videos
	@echo "Copying demo videos..."
	@cp -f src/assets/demo/*.mp4 android/app/src/main/assets/videos/ 2>/dev/null || true
	
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps (in separate terminals):$(NC)"
	@echo "1. make start.video.metro"
	@echo "2. make start.video.android"

start.video.metro:
	@echo "$(GREEN)Starting Metro bundler...$(NC)"
	npm start -- --reset-cache

start.video.android:
	@echo "$(GREEN)Starting Android app...$(NC)"
	npm run android

.PHONY: setup.video start.video.metro start.video.android 