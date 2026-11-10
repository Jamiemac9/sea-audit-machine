@echo off
REM Double-click to open Support Audit on Windows. The first run sets everything up.
cd /d "%~dp0"
if not exist .venv (
  echo First run: setting up, takes a minute...
  py -3 -m venv .venv || (echo Python 3 is missing. Install it from python.org, tick "Add to PATH", then try again. & pause & exit /b 1)
  .venv\Scripts\pip install -q -r requirements.txt
)
start "" .venv\Scripts\pythonw.exe app.py
