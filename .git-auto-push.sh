#!/bin/bash
# Auto Git Commit & Push Script
# This script commits and pushes changes every time it's called
# Add to .git/hooks or run via cron/systemd timer for periodic pushes

cd /workspaces/TIGER-VVIP || exit 1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[AUTO GIT]${NC} Starting auto-commit and push..."

# Check if there are changes
if git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}[AUTO GIT]${NC} No changes to commit."
    exit 0
fi

# Stage all changes
git add -A

# Get list of changed files (first 5)
CHANGED_FILES=$(git diff --cached --name-only | head -5)
FILE_COUNT=$(git diff --cached --name-only | wc -l)

if [ "$FILE_COUNT" -gt 5 ]; then
    CHANGED_FILES="$CHANGED_FILES
... and $((FILE_COUNT - 5)) more files"
fi

# Create commit message
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="auto: save changes at $TIMESTAMP

Files changed:
$CHANGED_FILES"

# Commit
if git commit -m "$COMMIT_MSG" 2>/dev/null; then
    echo -e "${GREEN}[AUTO GIT]${NC} ✅ Committed $FILE_COUNT files"
else
    echo -e "${RED}[AUTO GIT]${NC} ❌ Commit failed"
    exit 1
fi

# Push
if git push origin main 2>/dev/null; then
    echo -e "${GREEN}[AUTO GIT]${NC} ✅ Pushed to GitHub"
else
    echo -e "${RED}[AUTO GIT]${NC} ⚠️  Push failed (may be offline or auth issue)"
    echo -e "${YELLOW}[AUTO GIT]${NC} Changes are still saved locally"
    exit 1
fi

echo -e "${GREEN}[AUTO GIT]${NC} Done!"
