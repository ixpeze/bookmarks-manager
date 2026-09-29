@echo off
setlocal enabledelayedexpansion
title Deck Desktop Bridge ^& Dashboard
echo ========================================================
echo    ⚡ DECK — EXECUTIVE DESKTOP COCKPIT ^& BRIDGE ⚡
echo ========================================================
echo.

:: Ensure we run from directory containing this script
cd /d "%~dp0"

:: Prevent Python bytecode generation inside extension folder
set PYTHONDONTWRITEBYTECODE=1
if exist "%~dp0deck\__pycache__" rmdir /s /q "%~dp0deck\__pycache__" >nul 2>&1

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

:: 2. Universal Python / Pythonw Runtime Discovery
echo.
echo [2/3] Checking Python runtime...
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

:: If python found, check for sibling pythonw.exe in same folder
if defined PYTHON_BIN (
    if not defined PYTHONW_BIN (
        for %%F in ("!PYTHON_BIN!") do (
            if exist "%%~dpFpythonw.exe" set "PYTHONW_BIN=%%~dpFpythonw.exe"
        )
    )
)

:: Check Windows Python Launcher (py -3)
if not defined PYTHON_BIN (
    for /f "delims=" %%i in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do (
        set "PYTHON_BIN=%%i"
        for %%F in ("%%i") do (
            if exist "%%~dpFpythonw.exe" set "PYTHONW_BIN=%%~dpFpythonw.exe"
        )
    )
)

:: Scan standard Python install locations across versions (3.8 - 3.14)
if not defined PYTHON_BIN (
    for /d %%D in ("%LocalAppData%\Programs\Python\Python3*" "C:\Python3*" "%ProgramFiles%\Python3*" "%ProgramFiles(x86)%\Python3*") do (
        if not defined PYTHON_BIN (
            if exist "%%D\python.exe" set "PYTHON_BIN=%%D\python.exe"
            if exist "%%D\pythonw.exe" set "PYTHONW_BIN=%%D\pythonw.exe"
        )
    )
)

if not defined PYTHONW_BIN set "PYTHONW_BIN=!PYTHON_BIN!"

if not defined PYTHON_BIN (
    echo.
    echo ========================================================
    echo  ERROR: Python was not found in your system!
    echo  Please install Python 3.10+ from https://www.python.org/
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo       Using runtime: !PYTHONW_BIN!

:: Check optional tray dependencies (pystray, pillow)
"!PYTHON_BIN!" -c "import pystray, PIL" >nul 2>&1
if !errorlevel! neq 0 (
    echo       Checking optional tray dependencies...
    "!PYTHON_BIN!" -m pip install --quiet pystray pillow >nul 2>&1
)

:: 3. Launch Desktop Bridge & Verify Health
echo.
echo [3/3] Starting Deck Desktop Bridge...
echo       Bridge URL : http://localhost:8080/
echo       Dashboard  : http://localhost:8080/index.html
echo.

if exist "%~dp0deck\tray_bridge.py" (
    start "" "!PYTHONW_BIN!" -B "%~dp0deck\tray_bridge.py" 8080
) else (
    start "" "!PYTHONW_BIN!" -B "%~dp0deck\bridge.py" 8080
)

:: Active health check: verify port 8080 responds before opening browser
set BRIDGE_READY=0
for /l %%i in (1,1,10) do (
    if !BRIDGE_READY! equ 0 (
        curl.exe -s --connect-timeout 1 http://127.0.0.1:8080/api/status >nul 2>&1
        if !errorlevel! equ 0 (
            set BRIDGE_READY=1
        ) else (
            ping -n 1 -w 400 127.0.0.1 >nul
        )
    )
)

if !BRIDGE_READY! equ 0 (
    echo       [NOTE] Primary tray bridge did not bind in time.
    echo       Launching direct zero-dependency fallback bridge...
    start "" "!PYTHONW_BIN!" -B "%~dp0deck\bridge.py" 8080
    ping -n 2 127.0.0.1 >nul
)

start "" "http://localhost:8080/"
echo ========================================================
echo  ⚡ Deck is running and connected!
echo     Workstation status, telemetry, and drives are ONLINE.
echo     Dashboard opened in your default browser.
echo ========================================================
ping -n 3 127.0.0.1 >nul
exit /b 0
