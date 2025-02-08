# Core variables
APP_DIR := .
ANDROID_HOME ?= $(HOME)/Android/Sdk

# Colors for output
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

# Test configuration
TEST_OUTPUT_DIR := test-results
JEST_FLAGS := --silent --colors --config=jest.config.js

# Main test targets
.PHONY: test test.clean test.setup test.minimal

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
test.setup: check-env
	@echo "$(GREEN)Setting up test environment...$(NC)"
	@cd $(APP_DIR) && npm install

# Environment validation
check-env:
	@command -v node >/dev/null 2>&1 || { echo "$(RED)node is required$(NC)" >&2; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required$(NC)" >&2; exit 1; }

# Minimal test runner
test.minimal:
	@echo "$(GREEN)Running minimal tests...$(NC)"
	@cd $(APP_DIR) && npm run test:minimal $(JEST_FLAGS)

# Development convenience target
.PHONY: test.watch

test.watch:
	@echo "$(GREEN)Starting test watcher...$(NC)"
	@cd $(APP_DIR) && npm test -- --watch $(JEST_FLAGS)

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