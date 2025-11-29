@echo off
echo Starting Aura Synergy Hub Backend and Frontend...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Project Structure:
echo - Backend code: ./backend/
echo - Frontend code: ./Frontend/
echo.
pause
