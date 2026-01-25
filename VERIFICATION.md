# Post-Publication Verification

## 1. Verify Package on NPM

Visit: https://www.npmjs.com/package/opencode-timer-plugin

Should show:
- ✅ Version 1.0.0
- ✅ Description
- ✅ README content

## 2. Test Installation

```bash
# Clean test environment
cd /tmp
rm -rf test-opencode-plugin
mkdir test-opencode-plugin
cd test-opencode-plugin

# Create config
cat > .opencode/opencode.json <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-timer-plugin"]
}
EOF

# Test
opencode run "echo hello world"
```

## 3. Verify Plugin Loads

Check logs for:
```
INFO service=plugin path=opencode-timer-plugin loading plugin
```

No errors about:
```
❌ GET https://registry.npmjs.org/opencode-timer-plugin - 404
❌ BunInstallFailedError
```

## 4. Verify Functionality

### Terminal Title Updates
- ✅ Title shows `(1s) OpenCode`
- ✅ Updates every second: `(2s)`, `(3s)`, etc.
- ✅ Format changes at thresholds:
  - 60s → `(1m 0s)`
  - 3600s → `(1h 0m 0s)`
  - 86400s → `(1d 0h 0m)`

### Title Restoration
- ✅ Title resets to `OpenCode` immediately when session ends
- ✅ No lingering timer in title after completion

### Desktop Notifications
- ✅ Notification appears on session completion
- ✅ Shows runtime: "Runtime: 1m 23s"
- ✅ Shows agent output (truncated to ~200 chars)
- ✅ Notification title: "OpenCode Session Complete"

## 5. Test Edge Cases

### Multiple Sessions
```bash
# Terminal 1
opencode run "sleep 10 && echo first"

# Terminal 2 (while first is running)
opencode run "sleep 5 && echo second"
```

Expected:
- ✅ Each terminal has independent timer
- ✅ No interference between sessions

### Error Handling
```bash
opencode run "exit 1"
```

Expected:
- ✅ Timer stops on error
- ✅ Title resets to original
- ✅ Notification shows (or doesn't, based on config)

### Configuration
```bash
# Create custom config
mkdir -p ~/.config/opencode/plugins/timer-plugin
cat > ~/.config/opencode/plugins/timer-plugin/config.json <<'EOF'
{
  "updateInterval": 500,
  "titlePrefix": "Test",
  "notifyOnCompletion": false
}
EOF

opencode run "echo test"
```

Expected:
- ✅ Title updates every 500ms
- ✅ Title shows `(1s) Test`
- ✅ No notification on completion

## 6. Verify notify-send Works

```bash
notify-send "Test" "Notifications working" -i dialog-information
```

Expected:
- ✅ Desktop notification appears
- ✅ Shows in system tray

## 7. Terminal Compatibility

Test in different terminals:
- [ ] Ghostty
- [ ] Alacritya
- [ ] Gnome Terminal
- [ ] Konsole
- [ ] xterm
- [ ] Kitty

All should show title updates via ANSI escape sequences.

## 8. Uninstall Test

```bash
# Remove from config
jq 'del(.plugin[] | select(. == "opencode-timer-plugin"))' \
  ~/.config/opencode/opencode.json > /tmp/config.json
mv /tmp/config.json ~/.config/opencode/opencode.json

# Verify OpenCode still works
opencode run "echo test"
```

Expected:
- ✅ No timer in title
- ✅ No notifications
- ✅ OpenCode runs normally

## Success Criteria

All items checked:
- ✅ Published to npm (visible on npmjs.com)
- ✅ OpenCode loads plugin without errors
- ✅ Terminal title updates in real-time
- ✅ Title resets immediately on completion
- ✅ Desktop notifications work
- ✅ Configuration options work
- ✅ No crashes or errors in logs
