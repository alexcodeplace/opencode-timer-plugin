# OpenCode Terminal Title Timer Plugin

Displays session elapsed time in terminal window title, updating every second. Works with any terminal emulator (Ghostty, Alacritty, iTerm2, etc.).

## Features

- **Real-time terminal title updates** - Shows elapsed time in format `(Xh Ym Zs) OpenCode`
- **Desktop notifications** - Displays runtime and agent output when session completes
- **Multi-session support** - Independent timers for concurrent sessions
- **Configurable** - Customize update interval, title prefix, and notifications
- **Non-intrusive** - Title resets immediately when session ends

## Installation

### Option A: Local Plugin (All Projects)

```bash
mkdir -p ~/.config/opencode/plugins
ln -s ~/Projects/opencode-plugins/timer-plugin ~/.config/opencode/plugins/
```

### Option B: Project Plugin (Single Project)

```bash
mkdir -p .opencode/plugins
ln -s ~/Projects/opencode-plugins/timer-plugin .opencode/plugins/
```

### Option C: NPM Package (Recommended for Distribution)

```bash
cd ~/Projects/opencode-plugins/timer-plugin
npm publish
```

Then in your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-timer-plugin"]
}
```

## Configuration

Create `~/.config/opencode/plugins/timer-plugin/config.json` or `.opencode/plugins/timer-plugin/config.json`:

```json
{
  "updateInterval": 1000,
  "titlePrefix": "OpenCode",
  "notifyOnCompletion": true
}
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `updateInterval` | number | 1000 | Update frequency in milliseconds |
| `titlePrefix` | string | "OpenCode" | Terminal title prefix (restored after session) |
| `notifyOnCompletion` | boolean | true | Show desktop notification with runtime and output |

### Example Configurations

**Silent mode (no notifications):**
```json
{
  "notifyOnCompletion": false
}
```

**Faster updates (every 500ms):**
```json
{
  "updateInterval": 500
}
```

**Custom title:**
```json
{
  "titlePrefix": "My Project"
}
```

## Usage

1. Install the plugin (see Installation above)
2. Start an OpenCode session
3. Watch your terminal title update with elapsed time:
   - `(5s) OpenCode`
   - `(2m 15s) OpenCode`
   - `(1h 30m 45s) OpenCode`
   - `(2d 5h 30m) OpenCode`
4. When session completes, desktop notification shows:
   - Total runtime
   - Agent's final output text

## System Requirements

- **Bun runtime** (OpenCode standard)
- **Linux with notification daemon** (libnotify/notify-send)
  - Supported: Cinnamon, GNOME, KDE, XFCE, MATE
- **notify-send** command in PATH

### Verify notify-send

```bash
which notify-send
# Should output: /usr/bin/notify-send
```

### Install libnotify (if missing)

```bash
# Debian/Ubuntu/Mint
sudo apt install libnotify-bin

# Arch
sudo pacman -S libnotify

# Fedora
sudo dnf install libnotify
```

## Testing

### Pre-test: Verify Notifications

```bash
notify-send "Test" "Desktop notifications working" -i dialog-information
```

You should see a notification in your desktop environment's system tray.

### Plugin Testing

1. Install plugin in `~/.config/opencode/plugins/`
2. Note current terminal title
3. Start OpenCode session with simple prompt (e.g., "List files in current directory")
4. Verify terminal title shows:
   - `(1s) {original title}`
   - `(2s) {original title}`
   - Updates every second
5. Wait 60+ seconds, verify format changes to `(1m Xs) {original title}`
6. When session completes, verify:
   - Terminal title immediately resets to `{original title}`
   - Desktop notification appears with runtime and agent output

### Test Notification Disabled

1. Create config: `{ "notifyOnCompletion": false }`
2. Run session
3. Verify title updates work but no notification appears

## Terminal Compatibility

Tested with:
- ✅ Ghostty
- ✅ Alacritty
- ✅ iTerm2
- ✅ Gnome Terminal
- ✅ Konsole
- ✅ Windows Terminal

Uses standard ANSI escape sequences (`\x1b]0;...\x07`).

## Time Formatting

- 0-59s: `(5s) OpenCode`
- 1-59m: `(2m 15s) OpenCode`
- 1-23h: `(1h 30m 45s) OpenCode`
- 1+ days: `(2d 5h 30m) OpenCode`

## Architecture

### Event Handling

- `session.created` - Start timer, begin title updates
- `message.updated` - Capture agent's latest output
- `session.idle` - Stop timer, reset title, send notification
- `session.deleted` - Cleanup timer

### Edge Cases Handled

1. **Multiple sessions** - Each session has independent timer
2. **Session interruption** - Timer stops cleanly on error/deletion
3. **Long-running sessions** - Formats up to days
4. **Terminal compatibility** - Uses standard ANSI escape codes
5. **Title restoration** - Resets to original after completion

## Future Enhancements

- Pause/resume timer
- Custom tool to check elapsed time
- Log final times to file for analytics
- Notification action buttons
- Different urgency levels for long sessions

## License

MIT

## Author

Created for OpenCode CLI tool
