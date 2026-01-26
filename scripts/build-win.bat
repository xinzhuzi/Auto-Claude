@echo off
REM Auto-Claude Windows Packaging Script
REM Double-click this file to package for Windows
REM
REM Requirements:
REM   - Node.js 24+
REM   - npm

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   Auto-Claude Windows Packaging Script
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Display Node.js version
echo [INFO] Node.js version:
node --version
echo.

REM Get script directory and change to project root
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."
echo [INFO] Project directory: %CD%
echo.

REM Check if frontend directory exists
if not exist "apps\frontend" (
    echo [ERROR] Frontend directory not found: apps\frontend
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Change to frontend directory
cd apps\frontend
echo [INFO] Frontend directory: %CD%
echo.

REM Run the Windows packaging
echo [INFO] Starting Windows packaging...
echo This may take several minutes...
echo.
call npm run package:win

REM Check exit code
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo   Packaging completed successfully!
    echo ============================================================
    echo.
    echo Output directory: %CD%\dist\
    echo.
    echo Generated files:
    if exist dist\*.exe (
        dir /b dist\*.exe 2>nul
    )
    if exist dist\*.zip (
        dir /b dist\*.zip 2>nul
    )
    if exist dist\*.yml (
        dir /b dist\*.yml 2>nul
    )
    echo.
    echo Press any key to exit...
    pause >nul
) else (
    echo.
    echo ============================================================
    echo   Packaging failed with error code %ERRORLEVEL%
    echo ============================================================
    echo.
    echo Please check the error messages above.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b %ERRORLEVEL%
)

endlocal
