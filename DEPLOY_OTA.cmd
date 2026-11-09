@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

if /i "%~1"=="probe" goto probe
if /i "%~1"=="prepare" goto prepare
if /i "%~1"=="publish" goto publish_cli
if not "%~1"=="" goto usage

:menu
cls
echo =============================================================
echo Parola - signierte Android Web-Updates ^(Hostinger^)
echo Homepage bleibt unveraendert. Kein Google Play Upload.
echo =============================================================
echo [1] Server und freigegebenes Testpaket pruefen ^(nur LESEND^)
echo [2] Test-ZIP vorbereiten ^(keine Update-Aktivierung^)
echo [3] Echtes, bereits auf Android getestetes Update freigeben
echo [0] Beenden
echo.
choice /c 1230 /n /m "Auswahl: "
if errorlevel 4 exit /b 0
if errorlevel 3 goto menu_publish
if errorlevel 2 goto prepare_menu
if errorlevel 1 goto probe_menu
exit /b 1

:probe_menu
call :probe_run
call :menu_pause
goto menu

:prepare_menu
call :prepare_run
call :menu_pause
goto menu

:menu_publish
echo.
echo WICHTIG: Erst nach echtem Android-E2E-Test, Vault-Backup und Freigabe.
echo Diese Option macht ein signiertes Update fuer alle kompatiblen
echo Android-Installationen zugaenglich. Nicht nur ein Test-Upload!
echo.
set "VERSION="
set /p "VERSION=Getestete Web-Version ^(z.B. 0.7.3^): "
if "%VERSION%"=="" goto menu
choice /c JN /n /m "Android-Tests erfolgreich UND dieses Update jetzt live schalten? (J/N): "
if errorlevel 2 goto menu
call :publish_run "%VERSION%"
call :menu_pause
goto menu

:probe
call :probe_run
exit /b %errorlevel%

:prepare
call :prepare_run
exit /b %errorlevel%

:publish_cli
if "%~2"=="" goto usage
if /i not "%~3"=="--approve-tested-android-update" goto usage
echo.
echo MANUELLE FREIGABE fuer Parola Web-Version %~2 auf Hostinger.
echo Der Android-Geraetetest muss bereits erfolgreich abgeschlossen sein.
choice /c JN /n /m "Getestetes OTA jetzt LIVE veroeffentlichen? (J/N): "
if errorlevel 2 exit /b 2
call :publish_run "%~2"
exit /b %errorlevel%

:probe_run
call npm.cmd run ota:probe
exit /b %errorlevel%

:prepare_run
echo Hinweis: Nur ZIP/HTTPS-Konfiguration. Kein stable.json Upload.
call npm.cmd run ota:prepare
exit /b %errorlevel%

:publish_run
call npm.cmd run ota:stage -- --version %~1 --approve-tested-android-update
if errorlevel 1 exit /b 1
call npm.cmd run ota:publish -- --version %~1 --approve-tested-android-update
exit /b %errorlevel%

:menu_pause
echo.
pause
exit /b 0

:usage
echo Nutzung: DEPLOY_OTA.cmd [probe ^| prepare ^| publish X.Y.Z --approve-tested-android-update]
exit /b 2
