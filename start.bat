@echo off
setlocal EnableDelayedExpansion

REM ==========================================
REM  AGENTIC CV GENERATOR - SYSTEM STARTUP
REM ==========================================

REM Set console title
title Agentic CV Generator

REM Enable ANSI colors (Windows 10+)
color 0A

cls
echo.
echo  ========================================================================
echo   Starting Agentic CV Generator...
echo  ========================================================================
echo.

REM 1. CHECK NODE
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   Error: Node.js is not installed.
    echo   Please install Node.js to proceed.
    pause
    exit /b
)
echo   Node.js found.

REM 2. CHECK PYTHON
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo   Error: Python is not installed.
    echo   Please install Python to proceed.
    pause
    exit /b
)
echo   Python found.

REM 3. SETUP BACKEND
echo.
echo   Checking backend environment...
if not exist "backend\venv" (
    echo     - Creating virtual environment...
    cd backend
    python -m venv venv
    echo     - Installing requirements...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    deactivate
    cd ..
    echo     - Backend setup complete.
) ELSE (
    echo     - Backend is ready.
)

REM 4. SETUP FRONTEND
echo.
echo   Checking frontend environment...
if not exist "frontend\node_modules" (
    echo     - Installing dependencies...
    cd frontend
    call npm install
    cd ..
    echo     - Frontend setup complete.
) ELSE (
    echo     - Frontend is ready.
)

REM 5. LAUNCH SEQUENCE
echo.
echo   All checks passed.
echo   Starting servers...
echo   Press Ctrl+C to stop.
echo.

cd frontend

call npx -y concurrently -k -n "BACKEND,FRONTEND" -c "magenta,green" ^
    "cd ../backend && venv\Scripts\python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000" ^
    "npm run dev"

pause
