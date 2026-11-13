@echo off
chcp 65001 >nul
title HMZ Launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe.
  echo  Installe la version LTS depuis https://nodejs.org puis relance ce fichier.
  echo.
  start "" https://nodejs.org/fr
  pause
  exit /b 1
)

if not exist node_modules\electron\dist\electron.exe (
  echo.
  echo  Premiere installation : 1 a 2 minutes...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  L'installation a echoue. Verifie ta connexion internet puis relance.
    pause
    exit /b 1
  )
)

start "" node_modules\electron\dist\electron.exe .
exit /b 0
