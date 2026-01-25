# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in opencode-timer-plugin, please report it by emailing the maintainer. Do not create a public GitHub issue.

## Security Features

### Input Validation
- All configuration files are validated using Zod schema
- `updateInterval` limited to 100ms - 60000ms
- `titlePrefix` max length 100 characters

### Output Sanitization
- Terminal output sanitized to prevent ANSI escape sequence injection
- All control characters removed from terminal title
- Shell command arguments escaped to prevent command injection

### Secure Defaults
- Update interval defaults to 1000ms (1 second)
- Desktop notifications enabled by default
- No external network requests

## Security Considerations

### Desktop Notifications
Desktop notifications display AI assistant output, which may contain:
- Sensitive project information
- API keys or credentials if accidentally included in prompts
- Private data from your codebase

**Recommendation**: Disable notifications on shared systems by setting `notifyOnCompletion: false` in config.

### Configuration Files
Config files are loaded from:
1. Project directory: `.opencode/plugins/timer-plugin/config.json`
2. User home: `~/.config/opencode/plugins/timer-plugin/config.json`

Ensure config files have appropriate permissions (recommended: 600).

### Terminal Environment
The plugin reads `TERM_PROGRAM` environment variable and sanitizes it before use. No other environment variables are accessed.

## Dependency Security

Run `npm audit` regularly to check for vulnerabilities in dependencies:
```bash
npm audit
npm audit fix
```

## Changelog

### v1.0.3 (2026-01-25)
- **SECURITY**: Added Zod validation for config files
- **SECURITY**: Added ANSI escape sequence sanitization
- **SECURITY**: Added shell command argument escaping
- **SECURITY**: Added bounds checking for updateInterval
- **SECURITY**: Removed exposed npm token from repository

### v1.0.2 (2026-01-25)
- Initial TypeScript compilation

### v1.0.1 (2026-01-25)
- Added devDependencies

### v1.0.0 (2026-01-25)
- Initial release
