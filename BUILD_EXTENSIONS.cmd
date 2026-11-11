@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
echo Parola Chrome und Firefox - Testpakete (kein Store Upload)
where node.exe >nul 2>nul || (echo Node.js fehlt & exit /b 1)
call node --test extensions/tests/vault.test.mjs
if errorlevel 1 exit /b 1
call node scripts/build-browser-extensions.mjs
if errorlevel 1 exit /b 1
echo.
echo Testverzeichnisse erstellt:
echo   %~dp0browser-build\chrome
echo   %~dp0browser-build\firefox
echo.
echo Nur mit Testkonten pruefen, keine produktiven Passwoerter!
exit /b 0
