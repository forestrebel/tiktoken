#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking NO_CONFUSION rules..."

# 1. Verify flow3 candidate docs exist
FLOW3_DOCS=(
  "DEMO_DAILY.md"
  "NO_CONFUSION.md"
)

echo "Checking Flow3 candidates..."
for doc in "${FLOW3_DOCS[@]}"; do
  if [ ! -f "docs/core/$doc" ]; then
    echo -e "${RED}❌ Missing Flow3 doc: $doc${NC}"
    exit 1
  fi
  
  # Verify Flow3 candidate status
  if ! grep -q "LLM:state FLOW3_CANDIDATE" "docs/core/$doc"; then
    echo -e "${RED}❌ $doc missing Flow3 candidate status${NC}"
    exit 1
  fi
done

# 2. Check temporary docs
TEMP_DOCS=(
  "VICTORY_PATH.md"
)

echo "Checking temporary docs..."
for doc in "${TEMP_DOCS[@]}"; do
  if [ -f "docs/core/$doc" ]; then
    echo -e "${YELLOW}ℹ️ Found temporary doc: $doc${NC}"
  fi
done

# 3. Check for forbidden directories
FORBIDDEN_DIRS=(
  "utils"
  "misc"
  "temp"
  "old"
)

echo "Checking forbidden directories..."
for dir in "${FORBIDDEN_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${RED}❌ Forbidden directory found: $dir${NC}"
    exit 1
  fi
done

# 4. Check for forbidden file names
FORBIDDEN_FILES=(
  "util.js"
  "helper.js"
  "misc.js"
  "stuff.js"
)

echo "Checking forbidden files..."
for file in "${FORBIDDEN_FILES[@]}"; do
  if find . -name "$file" | grep -q .; then
    echo -e "${RED}❌ Forbidden file found: $file${NC}"
    exit 1
  fi
done

# 5. Verify file purposes
echo "Checking file purposes..."
for file in $(find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.md" \)); do
  if ! grep -q "purpose:" "$file" && ! grep -q "<!-- LLM:beacon" "$file"; then
    echo -e "${RED}❌ No clear purpose in: $file${NC}"
    exit 1
  fi
done

# 6. Check directory structure is flat
echo "Checking directory depth..."
MAX_DEPTH=3
DEEP_DIRS=$(find . -type d -mindepth $MAX_DEPTH)
if [ ! -z "$DEEP_DIRS" ]; then
  echo -e "${RED}❌ Directory structure too deep:${NC}"
  echo "$DEEP_DIRS"
  exit 1
fi

echo -e "${GREEN}✅ All clarity checks passed!${NC}"
echo -e "${YELLOW}ℹ️ Remember: DEMO_DAILY.md and NO_CONFUSION.md are Flow3 candidates${NC}" 