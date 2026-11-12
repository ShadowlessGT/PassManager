@echo off
setlocal
powershell.exe -NoProfile -NonInteractive -File "%~dp0tools\play-release\Build-Sign-Upload-Parola.ps1" -CheckOnly
exit /b %errorlevel%
