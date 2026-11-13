@echo off
chcp 65001 >nul
title HMZ Launcher - creation du .exe
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo  Installe d'abord Node.js depuis https://nodejs.org puis relance ce fichier.
  start "" https://nodejs.org/fr
  pause
  exit /b 1
)

echo.
echo  Creation de HMZ Launcher.exe (quelques minutes)...
echo.
call npm install --no-audit --no-fund
call npm run dist
if errorlevel 1 (
  echo.
  echo  La creation a echoue. Copie le message ci-dessus et envoie-le moi.
  pause
  exit /b 1
)
echo.
echo  Termine ! Le dossier "dist" contient :
echo   - HMZ-Launcher-Setup-2.2.0.exe (installe HMZ avec un raccourci sur le Bureau)
echo.
start "" dist
pause
