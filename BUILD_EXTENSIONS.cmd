@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
echo Parola Chrome und Firefox - Testpakete (kein Store Upload)
where node.exe >nul 2>nul || (echo Node.js fehlt & exit /b 1)
call npm.cmd run test:extension
if errorlevel 1 exit /b 1
call npm.cmd run extension:build
if errorlevel 1 exit /b 1
echo.
echo Entwicklungs-ZIPs erstellt (noch nicht im Store hochladen):
echo   %~dp0browser-build\parola-chrome-dev-0.2.0.zip
echo   %~dp0browser-build\parola-firefox-dev-0.2.0.zip
echo.
echo Testverzeichnisse erstellt:
echo   %~dp0browser-build\chrome
echo   %~dp0browser-build\firefox
echo.
echo Nur mit Testkonten pruefen, keine produktiven Passwoerter!
exit /b 0
