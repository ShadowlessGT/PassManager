@echo off
setlocal
REM Publishes the already uploaded AAB ONLY to the internal testing track.
python "%~dp0tools\play-release\Release-Parola-Internal-Test.py" --publish
exit /b %errorlevel%
