@echo off
setlocal enabledelayedexpansion
title Deck - 1-Click Multi-PC Setup & Sync
echo ========================================================
echo    ⚡ DECK — 1-CLICK MULTI-PC SETUP & SYNC ⚡
echo ========================================================
echo.
echo  FastShare Source: "%~dp0deck"
echo.

:: 1. Determine local high-speed SSD target directory
set "LOCAL_DECK=%LOCALAPPDATA%\Deck"
if exist "D:\AI\bookmarks-manager\deck" (
    set "LOCAL_DECK=D:\AI\bookmarks-manager\deck"
)

echo [1/4] Target local runtime on this PC:
echo       "!LOCAL_DECK!"
echo.

:: 2. Mirror files from FastShare to Local SSD
echo [2/4] Mirroring Deck from FastShare to local SSD...
if not exist "!LOCAL_DECK!" mkdir "!LOCAL_DECK!" >nul 2>&1

robocopy "%~dp0deck" "!LOCAL_DECK!" /MIR /FFT /R:1 /W:1 /XD __pycache__ .git >nul 2>&1
if !errorlevel! geq 8 (
    echo  [ERROR] Robocopy encountered an issue copying files from FastShare.
    echo  Please ensure this PC is connected to the network and has access to FastShare.
    pause
    exit /b 1
) else (
    echo       Files mirrored successfully to local SSD.
)

:: 3. Configure Local Desktop Bridge & Autostart
echo.
echo [3/4] Configuring local Python background bridge...
if exist "!LOCAL_DECK!\install_startup.bat" (
    call "!LOCAL_DECK!\install_startup.bat" --silent
    echo       Bridge autostart registered and launched.
) else (
    echo       [NOTE] install_startup.bat not found in local deck. Skipping bridge setup.
)

:: 4. Create Desktop Sync Script
set "SYNC_BAT=!LOCAL_DECK!\sync_from_fastshare.bat"
(
    echo @echo off
    echo title Sync Deck from FastShare
    echo echo Syncing Deck from FastShare...
    echo robocopy "%~dp0deck" "!LOCAL_DECK!" /MIR /FFT /R:1 /W:1 /XD __pycache__ .git
    echo echo.
    echo echo Done! Refresh Chrome tabs or chrome://extensions to apply changes.
    echo timeout /t 2 ^>nul
) > "!SYNC_BAT!"

:: Copy path to Windows Clipboard for effortless 1-click Chrome loading
powershell -NoProfile -Command "Set-Clipboard -Value '!LOCAL_DECK!'" >nul 2>&1

echo.
echo [4/4] Opening Chrome Extensions page...
start chrome "chrome://extensions" 2>nul
if !errorlevel! neq 0 (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
        start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    )
)

echo.
echo ========================================================
echo  ✨ SETUP COMPLETE FOR THIS PC! ✨
echo ========================================================
echo.
echo  NEXT STEPS IN CHROME:
echo    1. In the Chrome tab that just opened (chrome://extensions)
echo    2. Turn ON "Developer mode" (toggle in top-right corner)
echo    3. Click "Load unpacked" (top-left button)
echo    4. In the folder picker, press Ctrl+V and hit Enter!
echo       (The path "!LOCAL_DECK!" is already copied to your clipboard)
echo.
echo    5. Press Ctrl+T to test your new 0ms Deck dashboard!
echo ========================================================
echo.
pause
