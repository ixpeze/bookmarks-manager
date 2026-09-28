@echo off
setlocal enabledelayedexpansion
title Install Deck Bridge Silent Startup
echo ========================================================
echo    Deck Desktop Bridge — Silent Startup Installer
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TRAY_PY=%SCRIPT_DIR%tray_bridge.py"

:: 1. Locate pythonw.exe
set "PYTHONW_BIN="
where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where pythonw') do (
        if not defined PYTHONW_BIN set "PYTHONW_BIN=%%i"
    )
) else if exist "C:\Python314\pythonw.exe" (
    set "PYTHONW_BIN=C:\Python314\pythonw.exe"
) else if exist "%LocalAppData%\Programs\Python\Python312\pythonw.exe" (
    set "PYTHONW_BIN=%LocalAppData%\Programs\Python\Python312\pythonw.exe"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where python') do (
            set "PY_DIR=%%~dpi"
            if exist "!PY_DIR!pythonw.exe" set "PYTHONW_BIN=!PY_DIR!pythonw.exe"
        )
    )
)

if not defined PYTHONW_BIN (
    echo [ERROR] pythonw.exe could not be found!
    echo Please install Python with the standard Windows installer.
    pause
    exit /b 1
)

echo [1/2] Found pythonw runtime : "%PYTHONW_BIN%"
echo       Target Tray Daemon    : "%TRAY_PY%"
echo.

:: 2. Register Windows CurrentVersion\Run Registry Key (Standard, clean, no terminal window)
echo [2/2] Registering in Windows CurrentVersion\Run...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "DeckDesktopBridge" /t REG_SZ /d "\"%PYTHONW_BIN%\" \"%TRAY_PY%\"" /f >nul 2>&1

if %errorlevel% equ 0 (
    echo       Registered HKCU Run key: DeckDesktopBridge
) else (
    echo       [WARNING] Registry registration failed, using Startup folder fallback...
    set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    set "VBS_PATH=!STARTUP_FOLDER!\DeckBridge.vbs"
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run """%PYTHONW_BIN%"" """ ^& "%TRAY_PY%" ^& """", 0, False
    ) > "!VBS_PATH!"
    echo       Created Startup VBS: "!VBS_PATH!"
)

echo.
echo ========================================================
echo  [SUCCESS] Deck Desktop Bridge will now start silently
echo            in the Windows notification area on login.
echo ========================================================
echo.

:: 3. Offer to launch immediately
set /p LAUNCH_NOW="Launch Deck System Tray Bridge now? [Y/N, default Y]: "
if /i "%LAUNCH_NOW%"=="" set LAUNCH_NOW=Y
if /i "%LAUNCH_NOW%"=="Y" (
    echo Starting silent tray daemon...
    start "" "%PYTHONW_BIN%" "%TRAY_PY%"
    echo Deck is now active in your system tray.
)

echo.
echo To uninstall at any time, run uninstall_startup.bat.
echo.
pause
