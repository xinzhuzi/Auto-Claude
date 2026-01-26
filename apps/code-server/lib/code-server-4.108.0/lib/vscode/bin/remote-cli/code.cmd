@echo off
setlocal
set ROOT_DIR=%~dp0..\..\..\..
set VSROOT_DIR=%~dp0..\..
call "%ROOT_DIR%\node.exe" "%VSROOT_DIR%\out\server-cli.js" "code-server" "1.108.0" "9233f0438330450deb48a0b957820b5f0c7f1e91" "code-server.cmd" %*
endlocal
