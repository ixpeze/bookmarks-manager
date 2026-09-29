@echo off
setlocal enabledelayedexpansion
title Install Deck Bridge Silent Startup
echo ========================================================
echo    Deck Desktop Bridge — Silent Startup Installer
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TRAY_PY=%SCRIPT_DIR%tray_bridge.py"

:: Prevent Python bytecode generation inside extension folder
set PYTHONDONTWRITEBYTECODE=1
if exist "%SCRIPT_DIR%__pycache__" rmdir /s /q "%SCRIPT_DIR%__pycache__" >nul 2>&1

:: 1. Universal Pythonw Runtime Discovery
set "PYTHONW_BIN="
set "PYTHON_BIN="

:: Check where.exe pythonw
for /f "delims=" %%i in ('where.exe pythonw 2^>nul') do (
    if not defined PYTHONW_BIN set "PYTHONW_BIN=%%i"
)

:: Check where.exe python
for /f "delims=" %%i in ('where.exe python 2^>nul') do (
    if not defined PYTHON_BIN set "PYTHON_BIN=%%i"
)

:: If python found, check for sibling pythonw.exe
if defined PYTHON_BIN (
    if not defined PYTHONW_BIN (
        for %%F in ("!PYTHON_BIN!") do (
            if exist "%%~dpFpythonw.exe" set "PYTHONW_BIN=%%~dpFpythonw.exe"
        )
    )
)

:: Check Windows Python Launcher (py -3)
if not defined PYTHONW_BIN (
    for /f "delims=" %%i in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do (
        for %%F in ("%%i") do (
            if exist "%%~dpFpythonw.exe" set "PYTHONW_BIN=%%~dpFpythonw.exe"
        )
        if not defined PYTHONW_BIN set "PYTHONW_BIN=%%i"
    )
)

:: Scan standard Python install locations across versions (3.8 - 3.14)
if not defined PYTHONW_BIN (
    for /d %%D in ("%LocalAppData%\Programs\Python\Python3*" "C:\Python3*" "%ProgramFiles%\Python3*" "%ProgramFiles(x86)%\Python3*") do (
        if not defined PYTHONW_BIN (
            if exist "%%D\pythonw.exe" set "PYTHONW_BIN=%%D\pythonw.exe"
            if exist "%%D\python.exe" set "PYTHONW_BIN=%%D\python.exe"
        )
    )
)

if not defined PYTHONW_BIN (
    echo [ERROR] python / pythonw could not be found!
    echo Please install Python with the standard Windows installer.
    pause
    exit /b 1
)

echo [1/2] Found pythonw runtime : "%PYTHONW_BIN%"
echo       Target Tray Daemon    : "%TRAY_PY%"
echo.

:: 2. Register Windows CurrentVersion\Run Registry Key (Standard, clean, no terminal window)
echo [2/2] Registering in Windows CurrentVersion\Run...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "DeckDesktopBridge" /t REG_SZ /d "\"%PYTHONW_BIN%\" -B \"%TRAY_PY%\"" /f >nul 2>&1

if %errorlevel% equ 0 (
    echo       Registered HKCU Run key: DeckDesktopBridge
) else (
    echo       [WARNING] Registry registration failed, using Startup folder fallback...
    set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    set "VBS_PATH=!STARTUP_FOLDER!\DeckBridge.vbs"
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run """%PYTHONW_BIN%"" -B """ ^& "%TRAY_PY%" ^& """", 0, False
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
    start "" "%PYTHONW_BIN%" -B "%TRAY_PY%"
    echo Deck is now active in your system tray.
)

echo.
echo To uninstall at any time, run uninstall_startup.bat.
echo.
pause
