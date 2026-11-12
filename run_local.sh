#!/usr/bin/env bash
set -e

echo "=================================================================="
echo "  FLOODSHIELD AI — Local Full-Stack Launcher (Team Digital Pioneer)"
echo "=================================================================="

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[INFO] Created .env from .env.example (Demo/SQLite fallback active)"
fi

echo "[1/3] Starting FastAPI Backend on http://localhost:8000 ..."
(
  cd backend
  python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

echo "[2/3] Starting React + Vite Frontend on http://localhost:5173 ..."
(
  cd frontend
  if [ ! -d node_modules ]; then
    npm install
  fi
  npm run dev
) &
FRONTEND_PID=$!

echo "[3/3] FloodShield AI is running!"
echo "  -> Frontend UI:      http://localhost:5173"
echo "  -> Swagger API Docs: http://localhost:8000/api/docs"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait
