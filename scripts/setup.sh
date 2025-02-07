#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Import other scripts
source "$PROJECT_ROOT/scripts/validate-environment.sh"
source "$PROJECT_ROOT/scripts/setup-android-sdk.sh"
source "$PROJECT_ROOT/scripts/configure-paths.sh"

# Progress tracking
TOTAL_STEPS=3
current_step=0

# Error tracking
declare -A failed_steps
error_count=0

# Logging with timestamps
log() {
    local level=$1
    local message=$2
    local color=$NC
    
    case $level in
        "INFO") color=$GREEN ;;
        "WARN") color=$YELLOW ;;
        "ERROR") color=$RED ;;
        "PROGRESS") color=$BLUE ;;
    esac
    
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${color}${level}${NC}: ${message}"
}

# Progress bar
show_progress() {
    local step=$1
    local total=$TOTAL_STEPS
    local percentage=$((step * 100 / total))
    local completed=$((percentage / 2))
    local remaining=$((50 - completed))
    
    printf "\rProgress: ["
    printf "%${completed}s" | tr ' ' '='
    printf "%${remaining}s" | tr ' ' ' '
    printf "] %d%%" $percentage
    echo
}

# Error recovery function
handle_error() {
    local step=$1
    local error=$2
    
    failed_steps[$step]=$error
    ((error_count++))
    
    log "ERROR" "Step '$step' failed: $error"
    log "INFO" "This error has been recorded and will be included in the final report"
    
    case $step in
        "environment")
            log "INFO" "Try running with --debug flag for more information"
            ;;
        "android-sdk")
            log "INFO" "Check your internet connection and disk space"
            ;;
        "paths")
            log "INFO" "Ensure you have write permissions to configuration files"
            ;;
    esac
}

# Cleanup handler
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    rm -rf /tmp/android-sdk-setup-* 2>/dev/null || true
    rm -f /tmp/cmdline-tools.zip 2>/dev/null || true
}

# Generate setup report
generate_report() {
    local report_file="$PROJECT_ROOT/setup-report.txt"
    
    {
        echo "Setup Report - $(date)"
        echo "=================="
        echo
        echo "Environment Information:"
        echo "- OS: $(uname -a)"
        echo "- Shell: $SHELL"
        echo "- Project Root: $PROJECT_ROOT"
        echo
        echo "Steps Completed: $current_step/$TOTAL_STEPS"
        echo
        if [ ${#failed_steps[@]} -eq 0 ]; then
            echo "Status: SUCCESS - All steps completed successfully"
        else
            echo "Status: FAILED - ${#failed_steps[@]} step(s) failed"
            echo
            echo "Failed Steps:"
            for step in "${!failed_steps[@]}"; do
                echo "- $step: ${failed_steps[$step]}"
            done
        fi
        echo
        echo "Environment Variables:"
        echo "- ANDROID_HOME: $ANDROID_HOME"
        echo "- JAVA_HOME: $JAVA_HOME"
        echo
        echo "Next Steps:"
        if [ ${#failed_steps[@]} -eq 0 ]; then
            echo "1. Restart your terminal or run: source ~/.bashrc"
            echo "2. Try running: ./scripts/demo.sh"
        else
            echo "1. Review the errors above"
            echo "2. Run with --debug flag for more information"
            echo "3. Check the troubleshooting guide in README.md"
        fi
    } > "$report_file"
    
    log "INFO" "Setup report generated at: $report_file"
}

# Main setup function
main() {
    local debug_mode=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --debug)
                debug_mode=true
                shift
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Show initial progress
    show_progress $current_step
    
    # Step 1: Validate environment
    log "PROGRESS" "Step 1/$TOTAL_STEPS: Validating environment"
    if $debug_mode; then
        debug_environment
    fi
    if validate_basic_env; then
        ((current_step++))
        show_progress $current_step
    else
        handle_error "environment" "Basic environment validation failed"
    fi
    
    # Step 2: Setup Android SDK
    log "PROGRESS" "Step 2/$TOTAL_STEPS: Setting up Android SDK"
    if setup_android_sdk; then
        ((current_step++))
        show_progress $current_step
    else
        handle_error "android-sdk" "Android SDK setup failed"
    fi
    
    # Step 3: Configure paths
    log "PROGRESS" "Step 3/$TOTAL_STEPS: Configuring paths"
    if configure_paths; then
        ((current_step++))
        show_progress $current_step
    else
        handle_error "paths" "Path configuration failed"
    fi
    
    # Generate setup report
    generate_report
    
    # Final status
    if [ ${#failed_steps[@]} -eq 0 ]; then
        log "INFO" "Setup completed successfully!"
        log "INFO" "Please restart your terminal or run: source ~/.bashrc"
        return 0
    else
        log "ERROR" "Setup completed with ${#failed_steps[@]} error(s)"
        log "INFO" "Please check setup-report.txt for details"
        return 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 