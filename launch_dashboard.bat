@echo off
title Aura Command Center
echo ========================================================
echo    Aura Command Center — Local Dashboard Server
echo ========================================================
echo Serving at: http://localhost:8080/
echo Opening Chrome / Default Browser...
start "" "http://localhost:8080/"
cd /d "%~dp0dashboard"
python -m http.server 8080
