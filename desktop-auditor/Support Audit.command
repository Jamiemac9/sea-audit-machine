#!/bin/bash
# Double-click to open Support Audit on this Mac. The first time it sets itself up (a few minutes).
cd "$(dirname "$0")"
mkdir -p "$HOME/SupportAudit"
if [ ! -x .venv/bin/python ]; then
  echo "First run: setting up. This takes a few minutes, once."
  /usr/bin/env python3 -m venv .venv || { echo; echo "Python 3 is missing. Install it from python.org, then double-click this again."; read -r; exit 1; }
  ./.venv/bin/pip install -q --upgrade pip
  ./.venv/bin/pip install -q -r requirements.txt || { echo "Setup failed. Send Claude the lines above."; read -r; exit 1; }
  ./.venv/bin/python -m spacy download en_core_web_sm -q || echo "Name finder could not be downloaded; the page will show it as off."
fi
if ! curl -s -o /dev/null http://127.0.0.1:8765/api/state; then
  nohup ./.venv/bin/python server.py >> "$HOME/SupportAudit/server.log" 2>&1 &
  for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:8765/api/state && break; sleep 0.5; done
fi
open "http://127.0.0.1:8765"
