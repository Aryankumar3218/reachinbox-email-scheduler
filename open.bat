@echo off
setlocal
title ReachInbox - Login

echo ========================================
echo   ReachInbox Scheduler
echo   Opening Login Page...
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs"
set "PATH=%NODE_PATH%;%PATH%"

:: Step 1 - Check Redis
echo [1/4] Checking Redis on port 6379...
netstat -ano | findstr :6379 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     Starting portable Redis...
    start "Redis Server" "%PROJECT_DIR%tools\redis\redis-server.exe" "%PROJECT_DIR%tools\redis\redis.windows.conf"
    timeout /t 2 /nobreak >nul
) else (
    echo     Redis already running!
)

:: Step 2 - Start Backend + Frontend
echo.
echo [2/4] Starting Backend + Frontend servers...
start "ReachInbox - Dev" cmd /k "cd /d "%PROJECT_DIR%" && set PATH=%NODE_PATH%;%PATH% && npm run dev"

:: Step 3 - Wait for servers
echo.
echo [3/4] Waiting for servers to be ready (8 seconds)...
timeout /t 8 /nobreak >nul

:: Step 4 - Open login page
echo.
echo [4/4] Opening ReachInbox Login in your browser...
start "" "http://localhost:3000"

echo.
echo ========================================
echo   ReachInbox is running!
echo.
echo   Login Page:   http://localhost:3000
echo   Backend API:  http://localhost:5000
echo   Queue Board:  http://localhost:5000/admin/queues
echo ========================================
echo.
pause
