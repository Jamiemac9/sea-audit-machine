@echo off
REM Double-click to install or update Support Audit on this PC.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/Jamiemac9/sea-audit-machine/main/desktop-auditor/deploy/install-windows.ps1 | iex"
pause
