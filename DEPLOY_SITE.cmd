@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="publish" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1" -Publish
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1"
)
if errorlevel 1 exit /b 1
echo Parola site deployment finished.
endlocal
