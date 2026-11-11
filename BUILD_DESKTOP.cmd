@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
echo Parola Windows Desktop - Tauri 2
where cargo.exe >nul 2>nul || (echo Rust/Cargo fehlt - https://rustup.rs & exit /b 1)
where node.exe >nul 2>nul || (echo Node.js fehlt & exit /b 1)
pushd desktop
cargo tauri build
set "CODE=%ERRORLEVEL%"
popd
if not "%CODE%"=="0" echo Windows-Build fehlgeschlagen: siehe Tauri/Rust-Ausgabe.
if "%CODE%"=="0" echo Executable nachpruefen: desktop\src-tauri\target\release\parola_desktop.exe
exit /b %CODE%
