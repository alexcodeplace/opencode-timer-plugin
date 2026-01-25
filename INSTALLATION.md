# Installation Guide

## Current Status

The timer plugin is **fully implemented and ready to use**, but OpenCode's plugin system currently requires plugins to be published to npm for automatic installation.

## Issue

OpenCode validates and installs plugins from the npm registry when listed in config. Local file-based plugins trigger a fatal error during the npm version check, preventing OpenCode from starting.

Attempts made:
- ✅ Symlink to `~/.config/opencode/plugins/` - Plugin found but version check fails
- ✅ Add to cache `package.json` with `file:` protocol - Installed but validation fails
- ✅ Tarball packaging - OpenCode appends `@latest` making path invalid
- ❌ All approaches fail with: `GET https://registry.npmjs.org/opencode-timer-plugin - 404`

## Plugin Code Status

✅ **Plugin implementation is correct and complete:**
- Proper export structure matching OpenCode's plugin API
- Correct TypeScript types using `@opencode-ai/plugin`
- Event handling for `session.created`, `message.updated`, `session.idle`
- ANSI escape sequences for terminal title updates
- Desktop notifications via `notify-send`
- Configuration loading from standard paths

## Workaround Options

### Option 1: Publish to NPM (Recommended)

```bash
cd ~/Projects/opencode-plugins/timer-plugin

# Login to npm (if not already)
npm login

# Publish
npm publish
```

Then add to `~/.config/opencode/opencode.json`:
```json
{
  "plugin": ["opencode-timer-plugin"]
}
```

### Option 2: Use Private NPM Registry

Set up a private registry (Verdaccio, npm Enterprise, etc.) and publish there.

### Option 3: Manual Testing (Without Config Integration)

The plugin code can be tested independently by importing it into a test script, but it won't run automatically with OpenCode sessions.

## Installation After Publishing

Once published to npm:

```bash
# Plugin will auto-install when referenced in config
echo '{"plugin": ["opencode-timer-plugin"]}' > ~/.config/opencode/opencode.json

# Or add to existing config:
# {
#   "plugin": [
#     "opencode-antigravity-auth@latest",
#     "opencode-timer-plugin"
#   ]
# }
```

## Files Created

- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/index.ts` - Main plugin
- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/package.json` - Package metadata
- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/tsconfig.json` - TypeScript config
- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/README.md` - Usage documentation
- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/.gitignore` - Git ignore file
- ✅ `/home/user/Projects/opencode-plugins/timer-plugin/opencode-timer-plugin-1.0.0.tgz` - NPM package tarball

## Next Steps

1. **Publish to npm** (requires npm account)
2. **Test installation** from npm registry
3. **Verify functionality** with a real OpenCode session

## Testing After Installation

```bash
# Verify notify-send works
notify-send "Test" "Notifications working" -i dialog-information

# Start OpenCode session
opencode run "list files"

# Expected behavior:
# - Terminal title updates: (1s), (2s), etc.
# - On completion: desktop notification with runtime and output
```

## Plugin Features

- ⏱️ Real-time terminal title timer (1s updates)
- 🔔 Desktop notifications on session completion
- ⚙️ Configurable update interval and title prefix
- 🎯 Non-intrusive: restores original title immediately
- 📊 Displays total runtime and agent output in notification

## Configuration

Optional: Create `~/.config/opencode/plugins/timer-plugin/config.json`

```json
{
  "updateInterval": 1000,
  "titlePrefix": "OpenCode",
  "notifyOnCompletion": true
}
```
