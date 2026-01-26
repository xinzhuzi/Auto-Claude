@echo off
REM Auto-Claude Windows 打包测试脚本
REM 此脚本验证打包环境是否准备就绪,并执行打包

echo ========================================
echo Auto-Claude 打包测试
echo ========================================
echo.

REM 检查 Node.js 版本
echo [1/5] 检查 Node.js 版本...
node --version
if errorlevel 1 (
    echo 错误: 未找到 Node.js,请先安装 Node.js 24+
    exit /b 1
)
echo.

REM 检查 npm 版本
echo [2/5] 检查 npm 版本...
npm --version
if errorlevel 1 (
    echo 错误: 未找到 npm
    exit /b 1
)
echo.

REM 检查 Python 运行时
echo [3/5] 检查 Python 运行时...
if not exist "apps\frontend\python-runtime\win-x64\python\python.exe" (
    echo 警告: Python 运行时未找到
    echo 正在下载 Python 运行时...
    call npm run python:download
    if errorlevel 1 (
        echo 错误: Python 运行时下载失败
        exit /b 1
    )
) else (
    echo Python 运行时已就绪
)
echo.

REM 检查依赖是否安装
echo [4/5] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo 错误: 依赖安装失败
        exit /b 1
    )
)
if not exist "apps\frontend\node_modules" (
    echo 正在安装前端依赖...
    call npm run install:frontend
    if errorlevel 1 (
        echo 错误: 前端依赖安装失败
        exit /b 1
    )
)
echo 依赖已就绪
echo.

REM 执行打包
echo [5/5] 开始打包 Windows 版本...
echo ========================================
echo.
cd apps\frontend
call npm run package:win
set BUILD_RESULT=%errorlevel%
cd ..\..

echo.
echo ========================================
if %BUILD_RESULT% EQU 0 (
    echo ✓ 打包成功!
    echo.
    echo 安装程序位置:
    dir /b "apps\frontend\dist\*.exe" 2>nul
) else (
    echo ✗ 打包失败!
    echo 请检查上面的错误信息
)
echo ========================================

exit /b %BUILD_RESULT%
