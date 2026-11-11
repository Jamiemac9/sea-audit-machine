@echo off
REM Double-click to open Support Audit on this PC. The first time it sets itself up (a few minutes).
cd /d "%~dp0"
if not exist "%USERPROFILE%\SupportAudit" mkdir "%USERPROFILE%\SupportAudit"
if not exist .venv\Scripts\python.exe (
  echo First run: setting up. This takes a few minutes, once.
  py -3 -m venv .venv || (echo Python 3 is missing. Install it from python.org, tick "Add to PATH", then try again. & pause & exit /b 1)
  .venv\Scripts\python -m pip install -q --upgrade pip
  .venv\Scripts\pip install -q -r requirements.txt || (echo Setup failed. Send Claude the lines above. & pause & exit /b 1)
  .venv\Scripts\python -m spacy download en_core_web_sm -q
)
curl -s -o NUL http://127.0.0.1:8765/api/state || (
  start "" /b .venv\Scripts\pythonw.exe server.py
  timeout /t 6 /nobreak >NUL
)
start "" http://127.0.0.1:8765
