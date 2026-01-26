@echo off
REM This script is a wrapper that runs the Windows code-server
REM Uses relative path like the macOS version: ../lib/code-server-4.108.0-win/bin/code-server.cmd

set SCRIPT_DIR=%~dp0
set CODE_SERVER_SCRIPT=%SCRIPT_DIR%..\lib\code-server-4.108.0-win\bin\code-server.cmd

"%CODE_SERVER_SCRIPT%" %*
