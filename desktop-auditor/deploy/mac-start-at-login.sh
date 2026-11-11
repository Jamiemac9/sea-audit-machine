#!/bin/bash
# Optional: keep Support Audit running whenever this Mac is on, so the page is always there.
#   ./deploy/mac-start-at-login.sh          turn on
#   ./deploy/mac-start-at-login.sh off      turn off
set -e
APP="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/uk.supportaudit.server.plist"
if [ "$1" = "off" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true; rm -f "$PLIST"; echo "Turned off."; exit 0
fi
[ -x "$APP/.venv/bin/python" ] || { echo "Double-click 'Support Audit.command' once first, to set it up."; exit 1; }
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/SupportAudit"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>uk.supportaudit.server</string>
  <key>ProgramArguments</key><array><string>$APP/.venv/bin/python</string><string>$APP/server.py</string></array>
  <key>WorkingDirectory</key><string>$APP</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/SupportAudit/server.log</string>
  <key>StandardErrorPath</key><string>$HOME/SupportAudit/server.log</string>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "On. Support Audit now starts with this Mac: bookmark http://127.0.0.1:8765"
