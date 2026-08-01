@echo off
setlocal

REM One-click starter for backend and frontend dev servers
set "ROOT=%~dp0"

echo [INFO] Workspace: %ROOT%

if not exist "%ROOT%apps\backend\package.json" (
  echo [ERROR] Backend package.json not found: %ROOT%apps\backend\package.json
  pause
  exit /b 1
)

if not exist "%ROOT%apps\frontend\package.json" (
  echo [ERROR] Frontend package.json not found: %ROOT%apps\frontend\package.json
  pause
  exit /b 1
)

if not exist "%ROOT%apps\backend\node_modules" (
  echo [WARN] Backend dependencies may be missing. Run: cd apps\backend ^&^& npm install
)

if not exist "%ROOT%apps\frontend\node_modules" (
  echo [WARN] Frontend dependencies may be missing. Run: cd apps\frontend ^&^& npm install
)

echo [INFO] Starting backend in a new window...
start "Backend Dev Server" cmd /k "cd /d "%ROOT%apps\backend" && npm run dev"

echo [INFO] Starting frontend in a new window...
start "Frontend Dev Server" cmd /k "cd /d "%ROOT%apps\frontend" && npm run dev"

echo [DONE] Backend and frontend start commands have been launched.
echo [TIP] Close each server window to stop the service.
pause
