@echo off
setlocal
powershell.exe -NoProfile -NonInteractive -File "%~dp0tools\play-release\Initialize-Parola-Signing.ps1"
exit /b %errorlevel%
