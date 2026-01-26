@echo off
REM This script runs code-server using system node

set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%..

node "%ROOT%\out\node\entry.js" %*
