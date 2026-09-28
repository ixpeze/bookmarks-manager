@echo off
setlocal enabledelayedexpansion
title Deck Desktop Bridge ^& Dashboard
echo ========================================================
echo    ⚡ DECK — EXECUTIVE DESKTOP COCKPIT ^& BRIDGE ⚡
echo ========================================================
echo.

:: Ensure we run from directory containing this script
cd /d "%~dp0"

:: 1. Check if port 8080 is currently occupied
echo [1/3] Checking port 8080 status...
set OCCUPIED_PID=
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    set OCCUPIED_PID=%%a
)

if defined OCCUPIED_PID (
    echo       Port 8080 is held by PID !OCCUPIED_PID!. Checking session...
    set PROC_SESSION=
    for /f "tokens=4 delims=," %%s in ('tasklist /FI "PID eq !OCCUPIED_PID!" /FO CSV /NH 2^>nul') do (
        set PROC_SESSION=%%~s
    )
    if "!PROC_SESSION!"=="0" (
        echo       PID !OCCUPIED_PID! is running in headless Session 0 [isolated from screen].
        echo       Terminating headless PID !OCCUPIED_PID!...
        taskkill /F /PID !OCCUPIED_PID! >nul 2>&1
        ping -n 2 127.0.0.1 >nul
    ) else (
        echo       Testing bridge health...
        curl.exe -s --connect-timeout 1 http://127.0.0.1:8080/api/status >nul 2>&1
        if !errorlevel! equ 0 (
            echo       Bridge is already running interactively and healthy.
            echo       Opening Deck Dashboard in browser...
            start "" "http://localhost:8080/"
            echo.
            echo ========================================================
            echo    Deck is already running. You can close this window.
            echo ========================================================
            ping -n 3 127.0.0.1 >nul
            exit /b 0
        ) else (
            echo       Process !OCCUPIED_PID! is unresponsive.
            echo       Terminating stale PID !OCCUPIED_PID!...
            taskkill /F /PID !OCCUPIED_PID! >nul 2>&1
            ping -n 2 127.0.0.1 >nul
        )
    )
) else (
    echo       Port 8080 is free.
)

:: 2. Find Python / Pythonw runtime
echo.
echo [2/3] Checking Python runtime...
set PYTHONW_BIN=
set PYTHON_BIN=

where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHONW_BIN=pythonw
) else if exist "C:\Python314\pythonw.exe" (
    set PYTHONW_BIN="C:\Python314\pythonw.exe"
) else if exist "%LocalAppData%\Programs\Python\Python312\pythonw.exe" (
    set PYTHONW_BIN="%LocalAppData%\Programs\Python\Python312\pythonw.exe"
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_BIN=python
) else if exist "C:\Python314\python.exe" (
    set PYTHON_BIN="C:\Python314\python.exe"
) else if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set PYTHON_BIN="%LocalAppData%\Programs\Python\Python312\python.exe"
)

if not defined PYTHONW_BIN (
    if defined PYTHON_BIN (
        set PYTHONW_BIN=%PYTHON_BIN%
    ) else (
        echo.
        echo ========================================================
        echo  ERROR: Python was not found in your system PATH!
        echo  Please install Python 3.10+ from https://www.python.org/
        echo ========================================================
        echo.
        pause
        exit /b 1
    )
)
echo       Using runtime: %PYTHONW_BIN%

:: 3. Launch Silent System Tray Daemon & Browser
echo.
echo [3/3] Starting Deck Desktop Bridge (System Tray Daemon)...
echo       Bridge URL : http://localhost:8080/
echo       Dashboard  : http://localhost:8080/index.html
echo.

if exist "%~dp0deck\tray_bridge.py" (
    start "" %PYTHONW_BIN% "%~dp0deck\tray_bridge.py" 8080
    start "" "http://localhost:8080/"
    echo ========================================================
    echo  ⚡ Deck is running silently in the Windows System Tray!
    echo     Look for the Deck icon in the taskbar notification area.
    echo     Right-click the icon for controls or Windows autostart.
    echo ========================================================
    ping -n 3 127.0.0.1 >nul
    exit /b 0
) else (
    start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 600; Start-Process 'http://localhost:8080/'"
    cd /d "%~dp0deck"
    %PYTHON_BIN% bridge.py 8080
)
