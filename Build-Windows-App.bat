@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
  echo.
  echo First-time setup: installing tools. This can take a few minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Setup failed. Make sure you are connected to the internet, then try again.
    pause
    exit /b 1
  )
)

echo.
echo Building the Windows app...
echo The FIRST build also downloads some extra build tools, so it may
echo take several minutes. Later builds are much faster.
echo.

call npm run dist
if errorlevel 1 (
  echo.
  echo Build failed. Scroll up to read the error message.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  DONE! Your installer is in the "dist" folder.
echo  Look for a file ending in "Setup.exe".
echo ============================================================
pause
