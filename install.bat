@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

REM deck-studio 一键安装（win 入口）：找 Node → 跑 install.mjs → 暂停防闪退
where node >nul 2>nul
if not errorlevel 1 goto run_node

echo.
echo ==========================================
echo   未找到 Node.js（deck-studio 需要 Node 18+）
echo ==========================================
echo.
echo   请安装: winget install OpenJS.NodeJS.LTS
echo   或 https://nodejs.org/ 下载 LTS 安装包
echo.
pause
exit /b 1

:run_node
node install.mjs %*
echo.
pause
