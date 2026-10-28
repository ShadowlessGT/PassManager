@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

if /i "%~1"=="setup" goto setup
if /i "%~1"=="preview" goto preview
if /i "%~1"=="probe" goto probe
if /i "%~1"=="publish" goto publish
if not "%~1"=="" goto usage

:menu
cls
echo =====================================================
echo    Passwort Manager: Parola - Website Deployment
echo =====================================================
echo.
echo [1] SFTP/FTPS-Einstellungen oeffnen
echo [2] Website lokal bauen und Vorschau zeigen
echo [3] SFTP/FTPS-Verbindung und Zielverzeichnis pruefen
echo [4] Website auf Hostinger hochladen
echo [0] Beenden
echo.
choice /c 12340 /n /m "Auswahl: "
if errorlevel 5 exit /b 0
if errorlevel 4 goto menu_publish
if errorlevel 3 goto menu_probe
if errorlevel 2 goto menu_preview
if errorlevel 1 goto menu_setup
goto menu

:menu_setup
call :open_config
call :menu_result %errorlevel%
goto menu
:menu_preview
call :run_preview
call :menu_result %errorlevel%
goto menu
:menu_probe
call :run_probe
call :menu_result %errorlevel%
goto menu
:menu_publish
echo.
echo [Parola] Pruefe FTPS und vergleiche die Server-Versionsdatei ...
call :run_probe
if errorlevel 1 (
    echo.
    echo Upload nicht begonnen. Bitte die obige Fehlermeldung beheben.
    pause
    goto menu
)
echo.
echo Nur neue oder per SHA-256 geaenderte Dateien werden aktualisiert.
echo Unveraenderte Dateien werden uebersprungen. Keine Remote-Dateien werden geloescht.
echo Die Datei parola-deploy-manifest.json wird zuletzt aktualisiert.
choice /c JN /n /m "Geaenderte Dateien jetzt hochladen? (J/N): "
if errorlevel 2 goto menu
call :run_publish
call :menu_result %errorlevel%
goto menu

:menu_result
echo.
if not "%~1"=="0" (
    echo [FEHLER] Vorgang nicht abgeschlossen. Siehe Meldung oben.
    echo Bei fehlenden Zugangsdaten Option [1] verwenden.
) else (
    echo [OK] Vorgang abgeschlossen.
)
echo Zum Fortfahren Taste druecken...
pause >nul
exit /b 0

:setup
call :open_config
exit /b %errorlevel%
:preview
call :run_preview
exit /b %errorlevel%
:probe
call :run_probe
exit /b %errorlevel%
:publish
call :run_publish
exit /b %errorlevel%

:open_config
if not exist "deploy.local.env" (
    if not exist "deploy.local.env.example" (
        echo [FEHLER] deploy.local.env.example fehlt.
        exit /b 1
    )
    copy /y "deploy.local.env.example" "deploy.local.env" >nul
)
echo.
echo Lokale Datei: %CD%\deploy.local.env
echo Bitte SSH/FTP-Benutzer, Passwort und das EXAKTE Parola-Zielverzeichnis
echo aus Hostinger hinterlegen. Diese Datei NICHT nach GitHub hochladen.
start "" notepad.exe "%CD%\deploy.local.env"
exit /b 0

:run_preview
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1"
exit /b %errorlevel%
:run_probe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1" -Probe
exit /b %errorlevel%
:run_publish
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-site.ps1" -Publish
exit /b %errorlevel%

:usage
echo Unbekannter Parameter: %~1
echo Verwendung: DEPLOY_SITE.cmd [setup^|preview^|probe^|publish]
exit /b 2
