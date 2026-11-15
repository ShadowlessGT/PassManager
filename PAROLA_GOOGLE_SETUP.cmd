@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo PAROLA - Chrome und Firefox Google-Anmeldung (ENTWICKLER)
echo ============================================================
echo Keine Daten fuer Kunden. Keine Dienstkontoschluessel.
echo.
echo [1] Firebase + Google-Anmeldung live lesen
echo [2] Chrome-Web-Store Erweiterungs-ID eintragen
echo [3] Chrome OAuth-Client-ID eintragen
echo [4] Formular mit genauen Store-Feldern auf Desktop erstellen
echo [5] Test-ZIPs bauen (KEINE Veroeffentlichung)
echo [0] Beenden
echo.
choice /c 123450 /n /m "Auswahl: "
if errorlevel 6 exit /b 0
if errorlevel 5 goto build
if errorlevel 4 goto report
if errorlevel 3 goto chromeclient
if errorlevel 2 goto chromeid
if errorlevel 1 goto status

:status
call node scripts\browser-store-setup.mjs --status
exit /b %errorlevel%

:chromeid
set "ITEM_ID="
set /p "ITEM_ID=Chrome Web Store Item ID (32 Buchstaben a-p): "
if not defined ITEM_ID exit /b 2
call node scripts\browser-store-setup.mjs --set-chrome-id "%ITEM_ID%"
exit /b %errorlevel%

:chromeclient
set "CLIENT_ID="
set /p "CLIENT_ID=Google Auth Platform Chrome Extension OAuth Client ID: "
if not defined CLIENT_ID exit /b 2
call node scripts\browser-store-setup.mjs --set-chrome-client "%CLIENT_ID%"
exit /b %errorlevel%

:report
call node scripts\browser-store-setup.mjs --report
exit /b %errorlevel%

:build
echo.
echo Nur Test-/Entwurfpakete. Google-Anmeldung vorher konfigurieren.
call npm.cmd run test:extension
if errorlevel 1 exit /b 1
call npm.cmd run extension:build
exit /b %errorlevel%
