#!/usr/bin/env bash
# Install or update Support Audit on an Ubuntu/Debian server. Run from the repo:
#   sudo ./desktop-auditor/deploy/install.sh
# Safe to run again after a git pull: it updates the app and restarts it, and keeps
# the login, the blank form, the reference files and every audit.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/opt/supportaudit
USER_NAME=supportaudit
USER_HOME=/home/$USER_NAME

echo "1/6 System packages (Python, LibreOffice for page checks, fonts)"
apt-get update -qq
apt-get install -y -qq python3 python3-venv curl rsync fonts-dejavu-core tesseract-ocr >/dev/null
apt-get install -y -qq libreoffice-writer-nogui >/dev/null 2>&1 || apt-get install -y -qq libreoffice-writer >/dev/null

echo "2/6 Service user ($USER_NAME, owner-only home)"
id "$USER_NAME" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$USER_NAME"
chmod 700 "$USER_HOME"

echo "3/6 App files to $APP"
mkdir -p "$APP"
rsync -a --delete --exclude .venv --exclude __pycache__ --exclude tests --exclude '*.command' --exclude '*.bat' "$SRC/" "$APP/"
python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" install -q --upgrade pip
"$APP/.venv/bin/pip" install -q -r "$APP/requirements.txt"
"$APP/.venv/bin/python" -m spacy download en_core_web_sm -q
chown -R root:root "$APP"

echo "4/6 Claude Code for $USER_NAME"
if [ ! -x "$USER_HOME/.local/bin/claude" ]; then
  sudo -u "$USER_NAME" -H bash -c 'curl -fsSL https://claude.ai/install.sh | bash' >/dev/null
fi

echo "5/6 Background service"
install -m 644 "$SRC/deploy/supportaudit.service" /etc/systemd/system/supportaudit.service
systemctl daemon-reload
systemctl enable --now supportaudit >/dev/null
systemctl restart supportaudit

echo "6/6 Private address on your tailnet"
if command -v tailscale >/dev/null && tailscale status >/dev/null 2>&1; then
  tailscale serve --bg 8765 >/dev/null
  tailscale serve status | head -3
else
  echo "   Tailscale is not running here. Run: sudo tailscale up   then run this script again."
fi

if sudo -u "$USER_NAME" -H "$USER_HOME/.local/bin/claude" auth status --json 2>/dev/null | grep -q '"loggedIn": true'; then
  echo "Claude: logged in."
else
  echo
  echo "Last step, once only: log Claude in on this server."
  echo "   sudo -iu $USER_NAME claude auth login"
  echo "It shows a link: open it on your phone or laptop, sign in, paste the code back."
fi
echo "Done."
