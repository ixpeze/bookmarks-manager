@echo off
title Deck Desktop Bridge & Dashboard
echo ========================================================
echo    ⚡ DECK — EXECUTIVE DESKTOP COCKPIT & BRIDGE ⚡
echo ========================================================
echo Serving at: http://localhost:8080/
echo Starting Desktop Bridge Daemon...
start "" "http://localhost:8080/"
cd /d "%~dp0"
python bridge.py 8080
