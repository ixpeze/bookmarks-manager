@echo off
title Uninstall Deck Bridge Startup
echo ========================================================
echo    Deck Desktop Bridge — Auto-Start Uninstaller
echo ========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_PATH=%STARTUP_FOLDER%\DeckBridge.vbs"

if exist "%VBS_PATH%" (
    del /f /q "%VBS_PATH%"
    echo [SUCCESS] Removed DeckBridge.vbs from Windows Startup.
    echo Desktop Bridge will no longer auto-launch on boot.
) else (
    echo [INFO] DeckBridge auto-start was not installed.
)

echo.
pause
