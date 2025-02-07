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

# Import validation script
source "$PROJECT_ROOT/scripts/validate-environment.sh"

# Function to create environment file
create_env_file() {
    local env_file="$PROJECT_ROOT/.env"
    log_progress "Creating environment file at $env_file"
    
    # Get the actual paths
    local android_home="${HOME}/Android/Sdk"
    local java_home=$(readlink -f /usr/bin/java | sed "s:/bin/java::")
    
    # Create the environment file
    cat > "$env_file" << EOL
# Android SDK paths
export ANDROID_HOME="$android_home"
export ANDROID_SDK_ROOT="$android_home"

# Add Android tools to PATH
export PATH="\$PATH:\$ANDROID_HOME/emulator"
export PATH="\$PATH:\$ANDROID_HOME/platform-tools"
export PATH="\$PATH:\$ANDROID_HOME/tools"
export PATH="\$PATH:\$ANDROID_HOME/tools/bin"
export PATH="\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin"

# Java home
export JAVA_HOME="$java_home"

# Node environment
export NODE_ENV="development"
EOL
    
    # Make sure the file was created
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}ERROR: Failed to create environment file${NC}"
        return 1
    fi
    
    return 0
}

# Function to update shell configuration
update_shell_config() {
    local shell_type="bash"
    local rc_file="$HOME/.bashrc"
    
    # Detect shell type
    if [ -n "$ZSH_VERSION" ]; then
        shell_type="zsh"
        rc_file="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        shell_type="bash"
        rc_file="$HOME/.bashrc"
    else
        echo -e "${YELLOW}WARNING: Unknown shell type, defaulting to bash${NC}"
    fi
    
    log_progress "Updating $shell_type configuration in $rc_file"
    
    # Remove any existing configuration
    sed -i '/# Android environment setup/,/# End Android environment setup/d' "$rc_file"
    
    # Add new configuration
    cat >> "$rc_file" << EOL

# Android environment setup
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi
# End Android environment setup
EOL
    
    return 0
}

# Function to verify environment
verify_environment() {
    log_progress "Verifying environment configuration..."
    
    # Source the environment file
    source "$PROJECT_ROOT/.env"
    
    # Check required variables
    local required_vars=(
        "ANDROID_HOME"
        "ANDROID_SDK_ROOT"
        "JAVA_HOME"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}ERROR: Missing environment variables: ${missing_vars[*]}${NC}"
        return 1
    fi
    
    # Check if paths exist
    local required_paths=(
        "$ANDROID_HOME"
        "$ANDROID_HOME/emulator"
        "$ANDROID_HOME/platform-tools"
        "$JAVA_HOME"
    )
    
    local missing_paths=()
    for path in "${required_paths[@]}"; do
        if [ ! -d "$path" ]; then
            missing_paths+=("$path")
        fi
    done
    
    if [ ${#missing_paths[@]} -ne 0 ]; then
        echo -e "${RED}ERROR: Missing required paths: ${missing_paths[*]}${NC}"
        return 1
    fi
    
    return 0
}

# Main function to configure paths
configure_paths() {
    # First validate the environment
    if ! validate_basic_env; then
        echo -e "${RED}Environment validation failed. Please fix the issues above.${NC}"
        return 1
    }
    
    # Create environment file
    if ! create_env_file; then
        echo -e "${RED}Failed to create environment file${NC}"
        return 1
    }
    
    # Update shell configuration
    if ! update_shell_config; then
        echo -e "${RED}Failed to update shell configuration${NC}"
        return 1
    }
    
    # Verify environment
    if ! verify_environment; then
        echo -e "${RED}Environment verification failed${NC}"
        return 1
    }
    
    log_progress "Path configuration completed successfully"
    return 0
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if configure_paths; then
        echo -e "${GREEN}Path configuration successful${NC}"
        echo -e "${YELLOW}Please restart your terminal or run:${NC}"
        echo -e "${GREEN}source ~/.bashrc${NC}"
        exit 0
    else
        echo -e "${RED}Path configuration failed${NC}"
        exit 1
    fi
fi 