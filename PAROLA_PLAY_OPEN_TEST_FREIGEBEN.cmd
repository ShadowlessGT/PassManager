@echo off
setlocal
REM Only after verified real Android / Google Sign-In QA.
python "%~dp0tools\play-release\Release-Parola-Open-Test.py" --publish --qa-approved
exit /b %errorlevel%
