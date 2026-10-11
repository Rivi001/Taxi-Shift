@echo off
cd /d "%~dp0"
if not exist "node_modules\three\package.json" (
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and Node.js installation.
    pause
    exit /b 1
  )
)
echo Open http://localhost:5173 in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop the server.
call npm.cmd run dev
pause
