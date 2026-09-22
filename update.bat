@echo off
title Aura - Update Extension
echo ========================================================
echo    Aura Command Center - Update Script
echo ========================================================
echo.

:: Move to repo root regardless of where script is launched from
cd /d "%~dp0"

echo [1/3] Pulling latest changes from GitHub...
git pull
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: git pull failed. Check your internet connection
    echo         or run: git remote -v  to verify the remote.
    pause
    exit /b 1
)

echo.
echo [2/3] Opening chrome://extensions so you can reload the extension...
echo       ^> Find "Aura Command Center" and click the Refresh icon.
start "" "chrome://extensions"

echo.
echo [3/3] Done! Press any key to close.
echo ========================================================
pause >nul