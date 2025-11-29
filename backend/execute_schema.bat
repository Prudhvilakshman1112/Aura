@echo off
echo Creating Aura Synergy Hub Database Schema...
echo.

REM Load environment variables and execute schema
node scripts/createCompleteSchema.js

echo.
echo Schema execution completed!
pause
