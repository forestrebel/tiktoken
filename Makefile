# Development environment management
.PHONY: dev test deploy clean validate secrets

# Variables
ANDROID_DIR = app/android
VIDEO_MAX_SIZE = 104857600  # 100MB in bytes
SECRETS_DIR = .secrets

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