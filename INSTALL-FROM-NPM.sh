#!/bin/bash
set -e

echo "=== Installing OpenCode Timer Plugin from NPM ==="
echo ""

CONFIG_FILE="$HOME/.config/opencode/opencode.json"

# Backup existing config
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%s)"
    echo "✅ Backed up existing config"
fi

# Read existing config
if [ -f "$CONFIG_FILE" ]; then
    # Add plugin to existing config using jq if available
    if command -v jq &>/dev/null; then
        TMP=$(mktemp)
        jq '.plugin += ["opencode-timer-plugin"]' "$CONFIG_FILE" > "$TMP"
        mv "$TMP" "$CONFIG_FILE"
        echo "✅ Added opencode-timer-plugin to existing config"
    else
        echo ""
        echo "⚠️  Manual setup required (jq not installed)"
        echo ""
        echo "Add to $CONFIG_FILE:"
        echo '  "plugin": ["opencode-timer-plugin"]'
        echo ""
        exit 1
    fi
else
    # Create new config
    mkdir -p "$(dirname "$CONFIG_FILE")"
    cat > "$CONFIG_FILE" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-timer-plugin"]
}
EOF
    echo "✅ Created new config with timer plugin"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Test with:"
echo "  opencode run \"echo test\""
echo ""
echo "Expected behavior:"
echo "  - Terminal title updates: (1s), (2s), etc."
echo "  - Desktop notification on completion"
