# React Native Testing Guide: Make-Based Testing Strategy

## Introduction

This guide outlines our approach to testing React Native applications using Make as the primary orchestration tool. While scripts may be used for specific tasks, all test execution and environment management will be controlled through Make targets for consistency and simplicity.

## Core Testing Philosophy

The fundamental principle of our testing approach is to use Make as the single source of truth for all test-related operations. This means:

1. All test commands are executed through Make targets
2. Environment variables and configuration are managed in the Makefile
3. Build and test dependencies are explicitly declared
4. Test execution order and prerequisites are clearly defined

## Makefile Structure

Our testing infrastructure is built around a well-organized Makefile that handles all aspects of testing. Here is the recommended structure:

```makefile
# Core variables
ANDROID_DIR = app/android
APP_DIR := app
VERSION_CODE := $(shell date +%Y%m%d%H)
ANDROID_HOME ?= $(HOME)/Android/Sdk
JAVA_HOME ?= /usr/lib/jvm/java-11-openjdk-amd64

# Colors for output
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

# Test configuration
TEST_TYPES := unit integration e2e
TEST_OUTPUT_DIR := test-results
JEST_FLAGS := --silent --colors

# Emulator configuration
EMULATOR_NAME := Pixel7Pro
EMULATOR_PORT := 5554

# Main test targets
.PHONY: test test.clean test.setup test.unit test.integration test.e2e

# Primary test entry point
test: test.clean test.setup $(addprefix test., $(TEST_TYPES))
	@echo "$(GREEN)All tests completed$(NC)"

# Clean test environment
test.clean:
	@echo "$(GREEN)Cleaning test environment...$(NC)"
	@rm -rf $(TEST_OUTPUT_DIR)
	@cd $(APP_DIR) && rm -rf android/app/build android/.gradle
	@rm -rf $(TMPDIR)/metro-* || true
	@mkdir -p $(TEST_OUTPUT_DIR)
	@adb kill-server || true
	@adb devices | grep emulator | cut -f1 | while read line; do adb -s $$line emu kill; done || true
	@pkill -f "react-native" || true
	@pkill -f "metro" || true

# Set up test environment
test.setup: check-env
	@echo "$(GREEN)Setting up test environment...$(NC)"
	@cd $(APP_DIR) && yarn install
	@cd $(APP_DIR)/android && ./gradlew clean
	@echo "$(GREEN)Starting emulator...$(NC)"
	@$(ANDROID_HOME)/emulator/emulator -avd $(EMULATOR_NAME) -no-window -no-snapshot -no-audio -gpu swiftshader_indirect &
	@adb wait-for-device
	@until adb shell getprop sys.boot_completed | grep -q '1'; do sleep 1; done

# Environment validation
check-env:
	@command -v node >/dev/null 2>&1 || { echo "$(RED)node is required$(NC)" >&2; exit 1; }
	@command -v yarn >/dev/null 2>&1 || { echo "$(RED)yarn is required$(NC)" >&2; exit 1; }
	@command -v adb >/dev/null 2>&1 || { echo "$(RED)adb is required$(NC)" >&2; exit 1; }
	@test -d "$(ANDROID_HOME)" || { echo "$(RED)Android SDK not found$(NC)" >&2; exit 1; }

# Individual test runners
test.unit: export JEST_JUNIT_OUTPUT_DIR=$(TEST_OUTPUT_DIR)
test.unit: export JEST_JUNIT_OUTPUT_NAME=unit.xml
test.unit:
	@echo "$(GREEN)Running unit tests...$(NC)"
	@cd $(APP_DIR) && yarn test --testPathPattern=".*\.unit\.test\.(js|ts)x?" \
		--reporters=default --reporters=jest-junit \
		$(JEST_FLAGS)

test.integration: export JEST_JUNIT_OUTPUT_DIR=$(TEST_OUTPUT_DIR)
test.integration: export JEST_JUNIT_OUTPUT_NAME=integration.xml
test.integration:
	@echo "$(GREEN)Running integration tests...$(NC)"
	@cd $(APP_DIR) && yarn test --testPathPattern=".*\.integration\.test\.(js|ts)x?" \
		--reporters=default --reporters=jest-junit \
		$(JEST_FLAGS)

test.e2e: export JEST_JUNIT_OUTPUT_DIR=$(TEST_OUTPUT_DIR)
test.e2e: export JEST_JUNIT_OUTPUT_NAME=e2e.xml
test.e2e:
	@echo "$(GREEN)Running E2E tests...$(NC)"
	@cd $(APP_DIR) && yarn test --testPathPattern=".*\.e2e\.test\.(js|ts)x?" \
		--reporters=default --reporters=jest-junit \
		$(JEST_FLAGS)

# Development convenience targets
.PHONY: test.watch test.coverage

test.watch:
	@echo "$(GREEN)Starting test watcher...$(NC)"
	@cd $(APP_DIR) && yarn test --watch

test.coverage:
	@echo "$(GREEN)Generating coverage report...$(NC)"
	@cd $(APP_DIR) && yarn test --coverage --coverageDirectory=../$(TEST_OUTPUT_DIR)/coverage

# Metro bundler management
.PHONY: metro.start metro.stop metro.restart

metro.start:
	@echo "$(GREEN)Starting Metro bundler...$(NC)"
	@cd $(APP_DIR) && yarn start --reset-cache &

metro.stop:
	@pkill -f "react-native start" || true
	@pkill -f "metro" || true

metro.restart: metro.stop metro.start

# Emulator management
.PHONY: emu.start emu.stop emu.restart

emu.start:
	@echo "$(GREEN)Starting emulator...$(NC)"
	@$(ANDROID_HOME)/emulator/emulator -avd $(EMULATOR_NAME) -no-window -no-snapshot -no-audio -gpu swiftshader_indirect &
	@adb wait-for-device
	@until adb shell getprop sys.boot_completed | grep -q '1'; do sleep 1; done

emu.stop:
	@echo "$(GREEN)Stopping emulator...$(NC)"
	@adb devices | grep emulator | cut -f1 | while read line; do adb -s $$line emu kill; done || true

emu.restart: emu.stop emu.start
```

## Test Organization

Our tests are organized by type and purpose:

```
app/
├── __tests__/
│   ├── unit/
│   │   └── **/*.unit.test.js
│   ├── integration/
│   │   └── **/*.integration.test.js
│   └── e2e/
│       └── **/*.e2e.test.js
└── src/
    └── components/
        └── __tests__/
            └── ComponentName.unit.test.js
```

Each test file follows a specific naming convention that determines how it will be executed:
- `*.unit.test.js` - Unit tests
- `*.integration.test.js` - Integration tests
- `*.e2e.test.js` - End-to-end tests

## Test Configuration

Jest configuration is managed through `jest.config.js`:

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
};
```

## Using the Testing Framework

### Basic Usage

1. Run all tests:
```bash
make test
```

2. Run specific test types:
```bash
make test.unit
make test.integration
make test.e2e
```

3. Development mode:
```bash
make test.watch
```

4. Generate coverage report:
```bash
make test.coverage
```

### Handling Common Issues

1. Metro bundler problems:
```bash
make metro.restart
```

2. Emulator issues:
```bash
make emu.restart
```

3. Complete environment reset:
```bash
make test.clean test.setup
```

## Test Results and Reporting

Test results are stored in the `test-results` directory with the following structure:

```
test-results/
├── unit.xml
├── integration.xml
├── e2e.xml
└── coverage/
    └── index.html
```

## Migration Plan

### Phase 1: Initial Setup

1. Create the new Makefile structure
2. Set up basic test runners
3. Organize existing tests into the new structure

### Phase 2: Test Environment Management

1. Implement environment setup/teardown
2. Add emulator management
3. Configure Metro bundler handling

### Phase 3: Test Execution

1. Set up test runners for each type
2. Configure test reporting
3. Add coverage reporting

### Phase 4: CI Integration

1. Configure GitHub Actions
2. Set up test artifacts collection
3. Configure test result reporting

## Best Practices

1. Always use Make targets for test execution
2. Keep test files close to the code they test
3. Use appropriate test types for different testing needs
4. Maintain clean separation between test types
5. Use consistent naming conventions
6. Write deterministic tests
7. Clean up test environment after each run

## Test Writing Guidelines

### Unit Tests

```javascript
// src/components/__tests__/Button.unit.test.js
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button Component', () => {
  it('should handle press events', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress} title="Press Me" />);
    
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Integration Tests

```javascript
// __tests__/integration/Auth.integration.test.js
import { render, act } from '@testing-library/react-native';
import Auth from '../../src/services/Auth';
import App from '../../App';

describe('Authentication Flow', () => {
  it('should handle login process', async () => {
    const { getByTestId } = render(<App />);
    
    await act(async () => {
      // Test authentication flow
    });
    
    expect(Auth.isAuthenticated()).toBe(true);
  });
});
```

### E2E Tests

```javascript
// __tests__/e2e/UserFlow.e2e.test.js
import { device, element, by } from 'detox';

describe('User Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete main user journey', async () => {
    await element(by.id('login-button')).tap();
    // Complete test flow
  });
});
```

## Conclusion

This Make-based testing strategy provides a robust, maintainable approach to testing React Native applications. By centralizing all test-related operations in the Makefile, we ensure consistent test execution and environment management while maintaining flexibility for different testing needs.

Remember to regularly update this guide as testing requirements evolve and new patterns emerge in the codebase.
