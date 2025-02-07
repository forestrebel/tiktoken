#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Test results tracking
declare -A test_results
total_tests=0
passed_tests=0

# Logging with timestamps
log() {
    local level=$1
    local message=$2
    local color=$NC
    
    case $level in
        "INFO") color=$GREEN ;;
        "WARN") color=$YELLOW ;;
        "ERROR") color=$RED ;;
        "TEST") color=$BLUE ;;
    esac
    
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${color}${level}${NC}: ${message}"
}

# Test case wrapper
run_test() {
    local name=$1
    local description=$2
    shift 2
    local command=("$@")
    
    ((total_tests++))
    log "TEST" "Running test: $name"
    log "INFO" "Description: $description"
    
    if "${command[@]}"; then
        log "INFO" "✓ Test passed: $name"
        test_results[$name]="PASS"
        ((passed_tests++))
        return 0
    else
        log "ERROR" "✗ Test failed: $name"
        test_results[$name]="FAIL"
        return 1
    fi
}

# Clean environment for testing
clean_env() {
    log "INFO" "Cleaning test environment..."
    
    # Backup existing configuration
    if [ -f "$HOME/.bashrc" ]; then
        cp "$HOME/.bashrc" "$HOME/.bashrc.bak"
    fi
    if [ -f "$HOME/.zshrc" ]; then
        cp "$HOME/.zshrc" "$HOME/.zshrc.bak"
    fi
    if [ -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.bak"
    fi
    
    # Remove Android SDK for clean test
    if [ -d "$HOME/Android" ]; then
        mv "$HOME/Android" "$HOME/Android.bak"
    fi
    
    # Clear environment variables
    unset ANDROID_HOME
    unset ANDROID_SDK_ROOT
    unset JAVA_HOME
}

# Restore environment after testing
restore_env() {
    log "INFO" "Restoring environment..."
    
    # Restore configuration files
    if [ -f "$HOME/.bashrc.bak" ]; then
        mv "$HOME/.bashrc.bak" "$HOME/.bashrc"
    fi
    if [ -f "$HOME/.zshrc.bak" ]; then
        mv "$HOME/.zshrc.bak" "$HOME/.zshrc"
    fi
    if [ -f "$PROJECT_ROOT/.env.bak" ]; then
        mv "$PROJECT_ROOT/.env.bak" "$PROJECT_ROOT/.env"
    fi
    
    # Restore Android SDK
    if [ -d "$HOME/Android.bak" ]; then
        rm -rf "$HOME/Android"
        mv "$HOME/Android.bak" "$HOME/Android"
    fi
}

# Test Cases

test_clean_environment() {
    # Remove existing setup
    clean_env
    
    # Run setup script
    "$PROJECT_ROOT/scripts/setup.sh"
    local setup_status=$?
    
    # Verify setup
    [ $setup_status -eq 0 ] && \
    [ -f "$PROJECT_ROOT/.env" ] && \
    [ -d "$HOME/Android/Sdk" ] && \
    grep -q "ANDROID_HOME" "$HOME/.bashrc"
}

test_existing_sdk() {
    # Ensure SDK exists
    mkdir -p "$HOME/Android/Sdk/cmdline-tools/latest"
    touch "$HOME/Android/Sdk/cmdline-tools/latest/dummy"
    
    # Run setup script
    "$PROJECT_ROOT/scripts/setup.sh"
    local setup_status=$?
    
    # Verify setup preserved existing SDK
    [ $setup_status -eq 0 ] && \
    [ -f "$HOME/Android/Sdk/cmdline-tools/latest/dummy" ]
}

test_error_scenarios() {
    # Test with no write permission
    chmod -w "$PROJECT_ROOT"
    "$PROJECT_ROOT/scripts/setup.sh"
    local no_write_status=$?
    chmod +w "$PROJECT_ROOT"
    
    # Test with no internet (simulate with invalid proxy)
    http_proxy="http://invalid" "$PROJECT_ROOT/scripts/setup.sh"
    local no_internet_status=$?
    
    # Both should fail gracefully
    [ $no_write_status -eq 1 ] && [ $no_internet_status -eq 1 ]
}

test_path_resolution() {
    # Test from different directories
    (cd /tmp && "$PROJECT_ROOT/scripts/setup.sh")
    local tmp_status=$?
    
    (cd "$HOME" && "$PROJECT_ROOT/scripts/setup.sh")
    local home_status=$?
    
    [ $tmp_status -eq 0 ] && [ $home_status -eq 0 ]
}

test_shell_integration() {
    # Test with bash
    SHELL=/bin/bash "$PROJECT_ROOT/scripts/setup.sh"
    local bash_status=$?
    
    # Test with zsh if available
    local zsh_status=0
    if command -v zsh >/dev/null; then
        SHELL=/bin/zsh "$PROJECT_ROOT/scripts/setup.sh"
        zsh_status=$?
    fi
    
    [ $bash_status -eq 0 ] && [ $zsh_status -eq 0 ]
}

# Generate test report
generate_test_report() {
    local report_file="$PROJECT_ROOT/test-report.txt"
    
    {
        echo "Test Report - $(date)"
        echo "================="
        echo
        echo "Total Tests: $total_tests"
        echo "Passed: $passed_tests"
        echo "Failed: $((total_tests - passed_tests))"
        echo
        echo "Test Results:"
        for test in "${!test_results[@]}"; do
            printf "%-30s: %s\n" "$test" "${test_results[$test]}"
        done
        echo
        echo "Environment Information:"
        echo "- OS: $(uname -a)"
        echo "- Shell: $SHELL"
        echo "- Project Root: $PROJECT_ROOT"
    } > "$report_file"
    
    log "INFO" "Test report generated at: $report_file"
}

# Main test execution
main() {
    # Set up trap for cleanup
    trap restore_env EXIT
    
    # Run test cases
    run_test "clean_environment" \
        "Test setup on clean environment" \
        test_clean_environment
    
    run_test "existing_sdk" \
        "Test setup with existing Android SDK" \
        test_existing_sdk
    
    run_test "error_scenarios" \
        "Test handling of error scenarios" \
        test_error_scenarios
    
    run_test "path_resolution" \
        "Test path resolution from different directories" \
        test_path_resolution
    
    run_test "shell_integration" \
        "Test integration with different shells" \
        test_shell_integration
    
    # Generate test report
    generate_test_report
    
    # Final status
    if [ $passed_tests -eq $total_tests ]; then
        log "INFO" "All tests passed! ($passed_tests/$total_tests)"
        return 0
    else
        log "ERROR" "Some tests failed. ($passed_tests/$total_tests passed)"
        return 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 