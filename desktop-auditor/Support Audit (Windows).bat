@echo off
REM Opens Support Audit. Gets any updates first (restarting it if there were any), then opens the page.
cd /d "%~dp0"
set "SAH=%USERPROFILE%\SupportAudit"
if not exist "%SAH%" mkdir "%SAH%"
if not exist .venv\Scripts\python.exe (
  echo First run: setting up. This takes a few minutes, once.
  py -3 -m venv .venv || (echo Python 3 is missing. Run the installer again. & pause & exit /b 1)
  .venv\Scripts\python -m pip install -q --upgrade pip
  .venv\Scripts\pip install -q -r requirements.txt || (echo Setup failed. & pause & exit /b 1)
  .venv\Scripts\python -m spacy download en_core_web_sm -q
)
set "OLD=" & set "NEW="
for /f %%r in ('git -C .. rev-parse HEAD 2^>NUL') do set "OLD=%%r"
where git >NUL 2>&1 && git -C .. pull -q --ff-only
for /f %%r in ('git -C .. rev-parse HEAD 2^>NUL') do set "NEW=%%r"
if not "%OLD%"=="%NEW%" (
  echo Updating Support Audit...
  powershell -NoProfile -ExecutionPolicy Bypass -File deploy\stop-server.ps1
  .venv\Scripts\pip install -q -r requirements.txt
)
curl -s -o NUL http://127.0.0.1:8765/api/state && goto open
start "" .venv\Scripts\pythonw.exe server.py
for /l %%i in (1,1,30) do (
  timeout /t 1 /nobreak >NUL
  curl -s -o NUL http://127.0.0.1:8765/api/state && goto open
)
echo Support Audit did not start. Opening its log so you can send it to Claude.
start "" notepad "%SAH%\server.log"
pause
exit /b 1
:open
start "" http://127.0.0.1:8765
