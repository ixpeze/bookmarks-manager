@echo off
setlocal
title Deck - Update Extension
echo ========================================================
echo    DECK - EXTENSION ^& REPOSITORY UPDATE SCRIPT
echo ========================================================
echo.

:: Move to repository root regardless of where script is launched from
cd /d "%~dp0"

echo [1/3] Checking repository status...
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Not inside a valid git repository.
    echo.
    pause
    exit /b 1
)

:: Check for local uncommitted changes
git status --porcelain 2>nul | findstr /r "." >nul
if %errorlevel% equ 0 (
    echo       Notice: Local modifications detected.
    echo       Stashing local changes temporarily before pulling...
    git stash -u -m "auto-stash-update" >nul 2>&1
    set DID_STASH=1
) else (
    set DID_STASH=0
)

echo.
echo [2/3] Pulling latest changes from GitHub...
git pull
set PULL_STATUS=%errorlevel%

if "%DID_STASH%"=="1" (
    echo       Restoring your local modifications...
    git stash pop >nul 2>&1
)

if %PULL_STATUS% neq 0 (
    echo.
    echo  WARNING: git pull encountered an issue. Check your internet
    echo           connection or run 'git status' for details.
) else (
    echo       Latest updates fetched successfully.
)

echo.
echo [3/3] Opening Chrome Extensions page...
echo       ^> Locate "Deck" in your extensions list.
echo       ^> Click the Reload / Refresh button (round arrow).
echo.

:: Launch Chrome directly to extensions page
start chrome "chrome://extensions" 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
        start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else (
        echo Could not launch Chrome automatically.
        echo Please manually open: chrome://extensions
    )
)

echo.
echo ========================================================
echo    Done! Press any key to close.
echo ========================================================
pause >nul