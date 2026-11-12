@echo off
echo ==================================================================
echo   FLOODSHIELD AI - Local Full-Stack Launcher (Team Digital Pioneer)
echo ==================================================================

if not exist .env (
    copy .env.example .env
    echo [INFO] Created .env from .env.example
)

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "FloodShield AI Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting React + Vite Frontend on http://localhost:5173 ...
start "FloodShield AI Frontend" cmd /k "cd frontend && if not exist node_modules (npm install) && npm run dev"

echo FloodShield AI services launched!
echo   - Frontend Dashboard: http://localhost:5173
echo   - Backend Swagger UI: http://localhost:8000/api/docs
