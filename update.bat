@echo off

setlocal

title Deck - Extension Update & Reload

echo ========================================================

echo    ⚡ DECK — EXTENSION UPDATE ^& RELOAD SCRIPT ⚡

echo ========================================================

echo.



:: Move to repository root regardless of where script is launched from

cd /d "%~dp0"



:: Self-heal git safe.directory for network shares (UNC paths and mapped drives)

git config --global --add safe.directory "%~dp0" >nul 2>&1

set "ROOT_PATH=%~dp0"

set "ROOT_PATH=%ROOT_PATH:\=/%"

if "%ROOT_PATH:~-1%"=="/" set "ROOT_PATH=%ROOT_PATH:~0,-1%"

git config --global --add safe.directory "%(prefix)%ROOT_PATH%" >nul 2>&1

git config --global --add safe.directory "%ROOT_PATH%" >nul 2>&1

git config credential.https://github.com.username ixpeze >nul 2>&1



echo [1/3] Checking repository status...

git rev-parse --is-inside-work-tree >nul 2>&1

if %errorlevel% neq 0 (

    echo.

    echo  ERROR: Not inside a valid git repository.

    echo.

    pause

    exit /b 1

)



echo.

echo [2/3] Pulling latest updates from GitHub...

git pull --rebase --autostash

if %errorlevel% neq 0 (

    echo.

    echo  WARNING: git pull encountered an issue. Check your connection

    echo           or run 'git status' for details.

) else (

    echo       Repository is up to date.

)



echo.

:: Mirror updates to local SSD runtimes if they exist
if exist "%LOCALAPPDATA%\Deck" (
    echo       Syncing to %LOCALAPPDATA%\Deck...
    robocopy "%~dp0deck" "%LOCALAPPDATA%\Deck" /MIR /FFT /R:1 /W:1 /XD __pycache__ .git >nul 2>&1
)
if exist "D:\AI\bookmarks-manager\deck" (
    echo       Syncing to D:\AI\bookmarks-manager\deck...
    robocopy "%~dp0deck" "D:\AI\bookmarks-manager\deck" /MIR /FFT /R:1 /W:1 /XD __pycache__ .git >nul 2>&1
)

echo [3/3] Opening Chrome Extensions page...

:: Ensure no __pycache__ directory exists in deck before reloading

if exist "%~dp0deck\__pycache__" rmdir /s /q "%~dp0deck\__pycache__" >nul 2>&1

echo       ^> Locate "Deck" in your extensions list.

echo       ^> Click the Reload / Refresh icon (round arrow).

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

