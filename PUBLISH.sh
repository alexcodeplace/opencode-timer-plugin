#!/bin/bash
set -e

echo "=== OpenCode Timer Plugin - NPM Publishing ==="
echo ""

# Check if logged in
if ! npm whoami &>/dev/null; then
    echo "❌ Not logged in to npm"
    echo ""
    echo "Run: npm login"
    echo ""
    exit 1
fi

CURRENT_USER=$(npm whoami)
echo "✅ Logged in as: $CURRENT_USER"
echo ""

# Show package info
echo "Package to publish:"
echo "  Name: opencode-timer-plugin"
echo "  Version: 1.0.0"
echo ""

# Confirm
read -p "Publish to npm? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Publish
echo ""
echo "📦 Publishing..."
npm publish

echo ""
echo "✅ Published successfully!"
echo ""
echo "To install:"
echo '  echo '"'"'{"plugin": ["opencode-timer-plugin"]}'"'"' > ~/.config/opencode/opencode.json'
echo "  opencode run \"echo test\""
