@echo off
REM Starts every service in its own window (Windows). Run from the project root: scripts\run_all.bat
set ROOT=%~dp0..

for %%S in (auth-service:8001 student-service:8002 course-service:8003 api-gateway:8000) do (
  for /f "tokens=1,2 delims=:" %%A in ("%%S") do (
    if not exist "%ROOT%\services\%%A\.env" copy "%ROOT%\services\%%A\.env.example" "%ROOT%\services\%%A\.env" >nul
    if not exist "%ROOT%\services\%%A\.venv" python -m venv "%ROOT%\services\%%A\.venv"
    start "%%A" cmd /k "cd /d %ROOT%\services\%%A && .venv\Scripts\activate && pip install -q -r requirements.txt && uvicorn app.main:app --port %%B --reload"
  )
)

if not exist "%ROOT%\frontend\.env" copy "%ROOT%\frontend\.env.example" "%ROOT%\frontend\.env" >nul
start "frontend" cmd /k "cd /d %ROOT%\frontend && npm install && npm run dev"
