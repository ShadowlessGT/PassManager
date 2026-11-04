@echo off
chcp 65001 >nul
setlocal
cd /d "C:\Users\TamerBahar\source\repos\PassManager"
echo Parola Google Play listing upload - 20 translations, English graphics only
node "scripts\play-store-upload.mjs" --check
if errorlevel 1 goto FAIL
node "scripts\play-store-upload.mjs" --upload
if errorlevel 1 goto FAIL
echo.
echo SUCCESS: See H:\Meine Ablage\Sharing\Parola-PlayStore-EN\play-upload-report.json
pause
exit /b 0
:FAIL
echo.
echo NO SUCCESS: inspect the error above. Any uncommitted Google Play edit is not published.
pause
exit /b 1
