#!/usr/bin/env bash
# Starts all backend services and the React frontend (macOS / Linux / Git Bash).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${PYTHON:-python3}"
PIDS=()

start_service() {
  local dir="$ROOT/services/$1" port="$2"
  cd "$dir"
  [ -f .env ] || cp .env.example .env
  [ -d .venv ] || { "$PY" -m venv .venv; }
  if [ -f .venv/bin/activate ]; then source .venv/bin/activate; else source .venv/Scripts/activate; fi
  pip install -q -r requirements.txt
  uvicorn app.main:app --port "$port" --reload &
  PIDS+=($!)
  deactivate
}

trap 'kill ${PIDS[@]} 2>/dev/null' EXIT INT TERM

start_service auth-service 8001
start_service student-service 8002
start_service course-service 8003
start_service api-gateway 8000

cd "$ROOT/frontend"
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
npm run dev
