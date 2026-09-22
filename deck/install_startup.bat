@echo off
title Install Deck Bridge Startup
echo ========================================================
echo    Deck Desktop Bridge — Auto-Start Installer
echo ========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_PATH=%STARTUP_FOLDER%\DeckBridge.vbs"
set "BRIDGE_PY=%~dp0bridge.py"

echo Target Python script: "%BRIDGE_PY%"
echo Target Startup file : "%VBS_PATH%"
echo.

(
  echo Set WshShell = CreateObject^("WScript.Shell"^)
  echo WshShell.Run "pythonw """ ^& "%BRIDGE_PY%" ^& """ 8080", 0, False
) > "%VBS_PATH%"

if exist "%VBS_PATH%" (
    echo [SUCCESS] Deck Desktop Bridge will now launch silently in the background on Windows boot.
    echo To remove it at any time, run uninstall_startup.bat.
) else (
    echo [ERROR] Failed to create startup launcher.
)

echo.
pause
