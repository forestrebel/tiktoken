# Development environment management
.PHONY: dev test deploy clean validate secrets demo reset install-deps setup-android

# Variables
ANDROID_DIR = app/android
VIDEO_MAX_SIZE = 104857600  # 100MB in bytes
SECRETS_DIR = .secrets
ANDROID_HOME ?= $(HOME)/Android/Sdk
JAVA_HOME ?= /usr/lib/jvm/java-11-openjdk-amd64
SHELL := /bin/bash
PROJECT_NAME := tiktoken
APP_DIR := app

# Colors for output
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

# Demo environment
demo: check-deps install-deps setup-android
	@echo "Starting demo environment..."
	./scripts/demo.sh &
	@echo "Demo started in background. Use 'make reset' to reset the environment."

reset: check-deps
	@echo "Resetting demo environment..."
	./scripts/demo.sh reset

# Kill the demo environment
demo.stop:
	@echo "Stopping demo environment..."
	pkill -f "emulator" || true
	pkill -f "react-native start" || true
	adb kill-server || true
	rm -rf $(TMPDIR)/metro-* 2>/dev/null || true
	@echo "Demo environment stopped."

# Dependencies and setup
install-deps:
	@echo "Installing dependencies..."
	cd app && npm install

setup-android:
	@echo "Setting up Android environment..."
	cd app && ./setup-android.sh

# Development
dev: check-deps
	docker compose up -d
	cd app && npm start

dev.down:
	docker compose down -v

# Dependencies and setup
check-deps:
	@which ffmpeg > /dev/null || (echo "ffmpeg is required" && exit 1)
	@which adb > /dev/null || (echo "adb is required" && exit 1)
	@which docker > /dev/null || (echo "docker is required" && exit 1)

setup: check-deps
	# Setup development environment
	cp .env.example .env
	docker compose pull
	cd app && npm install
	cd backend && pip install -r requirements.txt
	cd ai && pip install -r requirements.txt

# Testing
test: test.backend test.mobile test.ai

test.backend:
	docker compose up -d supabase-db
	cd backend && pytest

test.mobile:
	cd app && npm test

test.ai:
	cd ai && pytest

# Validation
validate: validate.video validate.deps validate.env validate.secrets

validate.video:
	@echo "Validating video format and dimensions..."
	@test -f "$(VIDEO)" || (echo "Usage: make validate.video VIDEO=path/to/video.mp4" && exit 1)
	@echo "Video size: $$(stat -c%s "$(VIDEO)") bytes (max: $(VIDEO_MAX_SIZE))"
	@test $$(stat -c%s "$(VIDEO)") -le $(VIDEO_MAX_SIZE) || (echo "Video must be under 100MB" && exit 1)
	@echo "Checking dimensions..."
	@ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$(VIDEO)"
	@ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$(VIDEO)" | \
		awk -F'x' '{ aspect=$$1/$$2; printf "Aspect ratio: %.4f\n", aspect; if (aspect > 0.5725 || aspect < 0.5525) exit 1 }'

validate.deps:
	cd app && npx depcheck
	cd backend && pip check
	cd ai && pip check

validate.env:
	@test -f .env || (echo ".env file missing" && exit 1)
	@grep -q SUPABASE_URL .env || (echo "SUPABASE_URL missing in .env" && exit 1)
	@grep -q AWS_ACCESS_KEY_ID .env || (echo "AWS_ACCESS_KEY_ID missing in .env" && exit 1)

validate.secrets:
	@echo "Validating secrets..."
	@test -d $(SECRETS_DIR) || (echo "Secrets not initialized" && exit 1)
	@test -f .env || (echo ".env file missing" && exit 1)
	@for secret in $$(ls $(SECRETS_DIR) 2>/dev/null); do \
		grep -q "^$$secret=" .env || \
			(echo "Secret $$secret not in .env" && exit 1); \
	done
	@echo "Secrets validation passed"

# Build and Deploy
build: validate
	# Build mobile app
	cd $(ANDROID_DIR) && ./gradlew assembleRelease
	# Build backend containers
	docker compose -f docker-compose.prod.yml build

deploy: build
	# Deploy backend services
	docker compose -f docker-compose.prod.yml up -d
	# Upload mobile artifacts
	aws s3 cp $(ANDROID_DIR)/app/build/outputs/apk/release/app-release.apk \
		s3://tiktoken-artifacts/android/

deploy.mobile: validate.video
	cd $(ANDROID_DIR) && ./gradlew assembleRelease

deploy.backend:
	docker compose -f docker-compose.prod.yml up -d

# Cleanup
clean:
	docker compose down -v
	rm -rf $(ANDROID_DIR)/app/build
	rm -rf app/node_modules
	rm -rf app/android/.gradle
	rm -rf app/ios/build
	rm -rf $TMPDIR/metro-*
	find . -type d -name "__pycache__" -exec rm -r {} +

# Health checks
health: health.services health.deps

health.services:
	@echo "Checking services..."
	@curl -s http://localhost:8000/health || echo "API down"
	@curl -s http://localhost:5000/health || echo "AI down"
	@curl -s http://localhost:4000/health || echo "Firebase down"
	@curl -s http://localhost:4566/health || echo "AWS mock down"

health.deps:
	@echo "Checking dependencies..."
	@which ffmpeg || echo "ffmpeg missing"
	@which adb || echo "adb missing"
	@docker info > /dev/null 2>&1 || echo "docker down"

# Secrets Management
secrets.init:
	@mkdir -p $(SECRETS_DIR)
	@test -f .env || cp .env.example .env
	@echo "Secrets initialized"

secrets.get:
	@test -f $(SECRETS_DIR)/$(KEY) || (echo "Secret not found: $(KEY)" && exit 1)
	@cat $(SECRETS_DIR)/$(KEY)

secrets.set:
	@test -n "$(KEY)" || (echo "Usage: make secrets.set KEY=name VALUE=value" && exit 1)
	@test -n "$(VALUE)" || (echo "Usage: make secrets.set KEY=name VALUE=value" && exit 1)
	@mkdir -p $(SECRETS_DIR)
	@echo "$(VALUE)" > $(SECRETS_DIR)/$(KEY)
	@echo "Secret $(KEY) set"

secrets.delete:
	@test -n "$(KEY)" || (echo "Usage: make secrets.delete KEY=name" && exit 1)
	@rm -f $(SECRETS_DIR)/$(KEY)
	@echo "Secret $(KEY) deleted"

secrets.list:
	@test -d $(SECRETS_DIR) || (echo "No secrets found" && exit 0)
	@ls -1 $(SECRETS_DIR) 2>/dev/null || echo "No secrets found"

secrets.sync: secrets.init
	@echo "Syncing secrets..."
	@test -f .env || (echo ".env file missing" && exit 1)
	@for secret in $$(ls $(SECRETS_DIR) 2>/dev/null); do \
		value=$$(cat $(SECRETS_DIR)/$$secret); \
		grep -q "^$$secret=" .env && \
			sed -i "s|^$$secret=.*|$$secret=$$value|" .env || \
			echo "$$secret=$$value" >> .env; \
	done
	@echo "Secrets synced to .env"

# Firebase Infrastructure Management
.PHONY: firebase.init firebase.setup firebase.start firebase.stop firebase.logs firebase.health firebase.clean

# Environment variables
DOCKER_COMPOSE = docker-compose -f docker-compose.yml -f docker-compose.test.yml
FIREBASE_EMULATOR_HOST = localhost
FIREBASE_AUTH_PORT = 9099
FIREBASE_STORAGE_PORT = 9199
FIREBASE_UI_PORT = 4000

# Firebase initialization and setup
firebase.init: check-deps
	@echo "Initializing Firebase environment..."
	@test -f firebase.json || (echo "Error: firebase.json not found" && exit 1)
	@test -f storage.rules || (echo "Error: storage.rules not found" && exit 1)
	@mkdir -p test/fixtures
	@mkdir -p coverage

firebase.setup: firebase.init
	@echo "Setting up Firebase development environment..."
	npm install firebase-tools@latest
	npm install @firebase/rules-unit-testing
	chmod +x scripts/test.sh
	$(DOCKER_COMPOSE) pull firebase

# Firebase emulator management
firebase.start: firebase.setup
	@echo "Starting Firebase emulators..."
	$(DOCKER_COMPOSE) up -d firebase
	@$(MAKE) firebase.health

firebase.stop:
	@echo "Stopping Firebase emulators..."
	$(DOCKER_COMPOSE) stop firebase

firebase.logs:
	@echo "Viewing Firebase emulator logs..."
	$(DOCKER_COMPOSE) logs -f firebase

# Health checks
firebase.health:
	@echo "Checking Firebase emulator health..."
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		if curl -s http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_UI_PORT) > /dev/null; then \
			echo "Firebase emulators are healthy"; \
			exit 0; \
		fi; \
		echo "Waiting for emulators... $$timeout seconds remaining"; \
		sleep 1; \
		timeout=$$((timeout - 1)); \
	done; \
	echo "Error: Firebase emulators failed to start"; \
	$(MAKE) firebase.logs; \
	exit 1

# Comprehensive Firebase health check
.PHONY: firebase.verify
firebase.verify: firebase.health
	@echo "Performing comprehensive Firebase verification..."
	@echo "1. Checking emulator status..."
	@curl -s http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_UI_PORT)/emulators > /dev/null || (echo "Emulator UI not responding" && exit 1)
	@echo "2. Verifying auth emulator..."
	@curl -s http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_AUTH_PORT)/.json > /dev/null || (echo "Auth emulator not responding" && exit 1)
	@echo "3. Verifying storage emulator..."
	@curl -s http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_STORAGE_PORT)/.json > /dev/null || (echo "Storage emulator not responding" && exit 1)
	@echo "4. Checking rules compilation..."
	@firebase emulators:exec --only storage "echo 'Rules compilation successful'" > /dev/null || (echo "Rules compilation failed" && exit 1)
	@echo "5. Verifying test environment..."
	@test -d test/fixtures || (echo "Test fixtures directory missing" && exit 1)
	@test -d coverage || (echo "Coverage directory missing" && exit 1)
	@echo "6. Checking dependencies..."
	@npm list firebase-tools @firebase/rules-unit-testing > /dev/null || (echo "Firebase dependencies missing" && exit 1)
	@echo "All Firebase components verified successfully!"

# Testing infrastructure
.PHONY: test.init test.firebase test.rules test.app test.ci test.coverage test.clean

test.init: firebase.init
	@echo "Initializing test environment..."
	npm install
	@mkdir -p coverage

test.firebase: test.init
	@echo "Running Firebase integration tests..."
	FIREBASE_STORAGE_EMULATOR_HOST=$(FIREBASE_EMULATOR_HOST):$(FIREBASE_STORAGE_PORT) \
	FIREBASE_AUTH_EMULATOR_HOST=$(FIREBASE_EMULATOR_HOST):$(FIREBASE_AUTH_PORT) \
	npm run test:firebase

test.rules: test.init
	@echo "Running storage rules tests..."
	npm run test:rules

test.app: test.init
	@echo "Running application tests..."
	npm run test:app

test.coverage:
	@echo "Generating coverage report..."
	npm run coverage
	@echo "Coverage report available at coverage/lcov-report/index.html"

test.clean:
	@echo "Cleaning test artifacts..."
	rm -rf coverage .nyc_output test/fixtures/*
	$(DOCKER_COMPOSE) down -v

# CI/CD targets
test.ci: firebase.setup
	@echo "Running CI test suite..."
	$(MAKE) test.firebase
	$(MAKE) test.rules
	$(MAKE) test.app
	$(MAKE) test.coverage
	$(MAKE) test.clean

# Development workflow
.PHONY: dev.firebase dev.test dev.clean

dev.firebase: firebase.start
	@echo "Firebase development environment ready"
	@echo "Auth Emulator: http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_AUTH_PORT)"
	@echo "Storage Emulator: http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_STORAGE_PORT)"
	@echo "Emulator UI: http://$(FIREBASE_EMULATOR_HOST):$(FIREBASE_UI_PORT)"

dev.test: dev.firebase
	@echo "Running development tests..."
	$(MAKE) test.firebase
	$(MAKE) test.rules
	$(MAKE) test.app

dev.clean:
	@echo "Cleaning development environment..."
	$(MAKE) firebase.stop
	$(MAKE) test.clean

# Main targets
dev: dev.firebase

test: test.init
	@echo "Running all tests..."
	$(MAKE) test.firebase
	$(MAKE) test.rules
	$(MAKE) test.app
	$(MAKE) test.coverage

clean: dev.clean test.clean
	@echo "Environment cleaned"

# Help documentation
help: help.firebase
	@echo "Main Commands:"
	@echo "  make demo     - Set up and run the demo environment"
	@echo "  make reset    - Reset the demo environment"
	@echo "  make dev      - Start development environment"
	@echo "  make clean    - Clean all environments"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make install-deps    - Install project dependencies"
	@echo "  make setup-android   - Setup Android environment"
	@echo "  make setup          - Full development environment setup"
	@echo ""

help.firebase:
	@echo "Firebase Infrastructure Commands:"
	@echo "  make firebase.init    - Initialize Firebase environment"
	@echo "  make firebase.setup   - Set up Firebase development tools"
	@echo "  make firebase.start   - Start Firebase emulators"
	@echo "  make firebase.stop    - Stop Firebase emulators"
	@echo "  make firebase.logs    - View emulator logs"
	@echo "  make firebase.health  - Check emulator health"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test            - Run all tests"
	@echo "  make test.firebase   - Run Firebase integration tests"
	@echo "  make test.rules      - Run storage rules tests"
	@echo "  make test.app        - Run application tests"
	@echo "  make test.coverage   - Generate coverage report"
	@echo ""
	@echo "Development Workflow:"
	@echo "  make dev             - Start development environment"
	@echo "  make dev.test        - Run development test suite"
	@echo "  make dev.clean       - Clean development environment"
	@echo ""
	@echo "CI/CD Commands:"
	@echo "  make test.ci         - Run CI test suite"
	@echo "  make clean           - Clean all environments"

# Default target
all: help

# Initialize project
init:
	@echo -e "$(GREEN)Initializing React Native project...$(NC)"
	@npx react-native init $(PROJECT_NAME) --template react-native-template-typescript
	@echo -e "$(GREEN)Project initialized$(NC)"

# Check environment and dependencies
check:
	@echo -e "$(GREEN)Checking environment...$(NC)"
	@command -v java >/dev/null 2>&1 || { echo -e "$(RED)Java not found. Installing...$(NC)" && sudo apt-get update && sudo apt-get install -y openjdk-11-jdk; }
	@command -v adb >/dev/null 2>&1 || { echo -e "$(RED)ADB not found. Installing...$(NC)" && sudo apt-get install -y adb; }
	@command -v yarn >/dev/null 2>&1 || { echo -e "$(RED)Yarn not found. Installing...$(NC)" && sudo npm install -g yarn; }
	@command -v npx >/dev/null 2>&1 || { echo -e "$(RED)NPX not found. Installing...$(NC)" && sudo npm install -g npx; }
	@test -d "$(ANDROID_HOME)" || { echo -e "$(RED)Android SDK not found at $(ANDROID_HOME)$(NC)"; exit 1; }
	@test -d "$(ANDROID_HOME)/emulator" || { echo -e "$(RED)Android emulator not found$(NC)"; exit 1; }
	@$(ANDROID_HOME)/emulator/emulator -list-avds | grep -q "Pixel7Pro" || { echo -e "$(RED)Pixel7Pro AVD not found. Please create it in Android Studio$(NC)"; exit 1; }

# Install dependencies
install: check
	@echo -e "$(GREEN)Installing dependencies...$(NC)"
	@cd $(APP_DIR) && yarn install
	@cd $(APP_DIR)/android && chmod +x gradlew && ./gradlew clean

# Set up environment
setup: install
	@echo -e "$(GREEN)Setting up environment...$(NC)"
	@cd $(APP_DIR) && mkdir -p android/app/src/main/assets android/app/src/main/res/raw
	@cd $(APP_DIR) && npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Start the app (emulator + metro + app)
start: setup
	@echo -e "$(GREEN)Starting services...$(NC)"
	@# Start emulator in background
	@$(ANDROID_HOME)/emulator/emulator -avd Pixel7Pro -no-snapshot-load -no-audio & echo $$! > .emulator.pid
	@echo -e "$(GREEN)Waiting for emulator...$(NC)"
	@adb wait-for-device
	@while [ "$$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do sleep 2; done
	@# Start Metro in background
	@cd $(APP_DIR) && yarn start --reset-cache & echo $$! > ../.metro.pid
	@sleep 5
	@# Install and launch app
	@cd $(APP_DIR) && yarn android
	@echo -e "$(GREEN)App is running! Use 'make stop' to clean up$(NC)"

# Stop all services
stop:
	@echo -e "$(GREEN)Stopping services...$(NC)"
	@-kill $$(cat .emulator.pid 2>/dev/null) 2>/dev/null || true
	@-kill $$(cat .metro.pid 2>/dev/null) 2>/dev/null || true
	@-rm -f .emulator.pid .metro.pid
	@-adb emu kill >/dev/null 2>&1 || true
	@echo -e "$(GREEN)All services stopped$(NC)"

# Clean up everything
clean: stop
	@echo -e "$(GREEN)Cleaning up...$(NC)"
	@cd $(APP_DIR) && rm -rf node_modules android/app/build android/.gradle
	@cd $(APP_DIR)/android && ./gradlew clean
	@cd $(APP_DIR) && yarn cache clean
	@echo -e "$(GREEN)Cleanup complete$(NC)"

# Show help
help:
	@echo "Available commands:"
	@echo "  make check    - Check environment and dependencies"
	@echo "  make install  - Install project dependencies"
	@echo "  make setup    - Set up environment"
	@echo "  make start    - Start the app (emulator + metro + app)"
	@echo "  make stop     - Stop all services"
	@echo "  make clean    - Clean up everything"
	@echo "  make help     - Show this help message" 