@echo off
setlocal
title ReachInbox Scheduler - Startup Launcher

echo ========================================================
echo   ReachInbox Production-Grade Email Job Scheduler
echo ========================================================
echo.

set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs"
set "PATH=%NODE_PATH%;%PATH%"

:: Check if Redis is running, if not start bundled Windows Redis
echo [1/3] Checking Redis on port 6379...
netstat -ano | findstr :6379 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     Starting bundled portable Redis server in background...
    start "ReachInbox - Redis Server" "%~dp0tools\redis\redis-server.exe" "%~dp0tools\redis\redis.windows.conf"
    timeout /t 2 /nobreak >nul
) else (
    echo     Redis is already running on port 6379!
)

:: Start Backend
echo.
echo [2/3] Starting Backend API Server (Port 5000)...
start "ReachInbox - Backend Server" cmd /k "cd /d "%~dp0backend" && set "PATH=%NODE_PATH%;%PATH%" && npm run dev"

:: Start Frontend
echo.
echo [3/3] Starting Frontend Dashboard (Port 3000)...
start "ReachInbox - Frontend Dashboard" cmd /k "cd /d "%~dp0frontend" && set "PATH=%NODE_PATH%;%PATH%" && npm run dev"

echo.
echo ========================================================
echo   Services are booting up!
echo   - Frontend:    http://localhost:3000
echo   - BullMQ Board: http://localhost:5000/admin/queues
echo   - Backend API:  http://localhost:5000/api/emails
echo ========================================================
echo.
echo Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:3000

pause
