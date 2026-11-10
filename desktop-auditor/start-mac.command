#!/bin/bash
# Double-click to open Support Audit on a Mac. The first run sets everything up.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First run: setting up (takes a minute)..."
  python3 -m venv .venv || { echo "Python 3 is missing. Install it from python.org, then try again."; read; exit 1; }
  ./.venv/bin/pip install -q -r requirements.txt
fi
./.venv/bin/python app.py
