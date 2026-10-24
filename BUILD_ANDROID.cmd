@echo off
setlocal
cd /d "%~dp0"
echo PassManager local Android build. GitHub Actions are NOT used.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-android.ps1" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" echo BUILD FAILED: %EXITCODE%
if "%EXITCODE%"=="0" echo APK ready in H:\Meine Ablage\Sharing\APKs
exit /b %EXITCODE%
