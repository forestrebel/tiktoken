#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m'

# Copy hooks and make them executable
cp .hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo -e "${GREEN}Git hooks installed successfully${NC}" 