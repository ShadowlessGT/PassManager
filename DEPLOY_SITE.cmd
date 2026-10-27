@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="setup" (
  if not exist "deploy.local.env" copy /y "deploy.local.env.example" "deploy.local.env" >nul
  start "" notepad.exe "%~dp0deploy.local.env"
  echo Bitte FTP-Benutzername, Passwort und das echte Parola-Zielverzeichnis eintragen.
  exit /b 0
)
if /i "%~1"=="publish" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1" -Publish
) else if /i "%~1"=="probe" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1" -Probe
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1"
)
if errorlevel 1 exit /b 1
echo Parola Website: Vorgang erfolgreich.
endlocal
