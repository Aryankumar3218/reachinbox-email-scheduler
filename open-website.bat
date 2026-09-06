@echo off
echo Opening ReachInbox Scheduler in browser...

start "" "http://localhost:3000"
timeout /t 1 /nobreak >nul
start "" "http://localhost:5000/admin/queues"

echo Done! Check your browser.
