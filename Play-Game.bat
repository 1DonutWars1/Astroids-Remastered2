@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
  echo.
  echo First-time setup: downloading the app engine ^(Electron^).
  echo This can take a few minutes. You only have to do this ONCE.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Setup failed. Make sure you are connected to the internet, then try again.
    pause
    exit /b 1
  )
)

echo Starting Asteroids Remastered...
call npm start
