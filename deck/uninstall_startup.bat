@echo off
setlocal enabledelayedexpansion
title Uninstall Deck Bridge Startup
echo ========================================================
echo    Deck Desktop Bridge — Auto-Start Uninstaller
echo ========================================================
echo.

echo [1/2] Removing Windows Registry autostart key...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "DeckDesktopBridge" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo       Removed HKCU Run key: DeckDesktopBridge
) else (
    echo       HKCU Run key was not set or already removed.
)

echo [2/2] Checking Startup folder...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_PATH=%STARTUP_FOLDER%\DeckBridge.vbs"

if exist "%VBS_PATH%" (
    del /f /q "%VBS_PATH%" >nul 2>&1
    echo       Removed legacy DeckBridge.vbs from Startup folder.
) else (
    echo       No legacy Startup folder scripts found.
)

echo.
echo ========================================================
echo  [SUCCESS] Deck Desktop Bridge will no longer auto-launch
echo            on Windows startup.
echo ========================================================
echo.
pause
