@echo off
echo Starting Portable Redis Server for Windows on port 6379...
"%~dp0tools\redis\redis-server.exe" "%~dp0tools\redis\redis.windows.conf"
pause
