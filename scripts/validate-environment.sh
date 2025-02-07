#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Exit on error
set -e

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Logging function
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Debug information function
debug_environment() {
    echo "=== Environment Debug Info ==="
    echo "Project Root: $PROJECT_ROOT"
    echo "Current User: $(whoami)"
    echo "Write Permission: $(test -w "$PROJECT_ROOT" && echo "Yes" || echo "No")"
    echo "Required Commands:"
    for cmd in java wget unzip curl git npm; do
        printf "%-10s: %s\n" "$cmd" "$(command -v "$cmd" 2>/dev/null || echo "Not found")"
    done
    echo "System Info:"
    echo "  OS: $(uname -a)"
    echo "  Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo "  Disk Space: $(df -h "$PROJECT_ROOT" | tail -n 1 | awk '{print $4}') available"
}

# Validate basic environment requirements
validate_basic_env() {
    log_progress "Validating basic environment requirements..."

    # Check write permissions
    if [ ! -w "$PROJECT_ROOT" ]; then
        echo -e "${RED}ERROR: No write permission for project directory: $PROJECT_ROOT${NC}"
        return 1
    fi

    # Check for required commands
    local required_commands=(
        "java"
        "wget"
        "unzip"
        "curl"
        "git"
        "npm"
    )

    local missing_commands=()
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_commands+=("$cmd")
        fi
    done

    if [ ${#missing_commands[@]} -ne 0 ]; then
        echo -e "${RED}ERROR: Required commands not found: ${missing_commands[*]}${NC}"
        echo -e "${YELLOW}Please install missing dependencies:${NC}"
        echo "sudo apt-get update && sudo apt-get install -y ${missing_commands[*]}"
        return 1
    fi

    # Check minimum disk space (need at least 10GB free)
    local free_space=$(df -k "$PROJECT_ROOT" | tail -n 1 | awk '{print $4}')
    if [ "$free_space" -lt 10485760 ]; then  # 10GB in KB
        echo -e "${RED}ERROR: Insufficient disk space. Need at least 10GB free.${NC}"
        return 1
    }

    # Check minimum memory (need at least 4GB)
    local total_mem=$(free -m | grep Mem | awk '{print $2}')
    if [ "$total_mem" -lt 4096 ]; then  # 4GB in MB
        echo -e "${RED}ERROR: Insufficient memory. Need at least 4GB RAM.${NC}"
        return 1
    }

    # Check Java version (need Java 11)
    local java_version=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$java_version" != "11" ]; then
        echo -e "${RED}ERROR: Wrong Java version. Need Java 11, found version $java_version${NC}"
        return 1
    }

    # Check npm version (need npm >= 6)
    local npm_version=$(npm -v | cut -d'.' -f1)
    if [ "$npm_version" -lt 6 ]; then
        echo -e "${RED}ERROR: npm version too old. Need npm >= 6, found version $npm_version${NC}"
        return 1
    }

    log_progress "Basic environment validation passed"
    return 0
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Run in debug mode if requested
    if [ "$1" == "--debug" ]; then
        debug_environment
        exit 0
    fi

    # Otherwise run validation
    if validate_basic_env; then
        echo -e "${GREEN}Environment validation successful${NC}"
        exit 0
    else
        echo -e "${RED}Environment validation failed${NC}"
        echo -e "${YELLOW}Run with --debug for more information${NC}"
        exit 1
    fi
fi 