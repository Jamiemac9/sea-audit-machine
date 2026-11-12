@echo off
REM Opens Support Audit (updates itself first). The work is done by deploy\launch.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0deploy\launch.ps1"
