@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  One-click starter for backend and frontend dev servers
REM  On first run : detects Node.js; if missing, downloads fnm
REM                 (Fast Node Manager) into .env\fnm and uses
REM                 it to install Node.js LTS locally, then runs
REM                 npm install for both apps.
REM  Subsequent   : reads .env\.ready flag and skips all setup.
REM ============================================================

set "ROOT=%~dp0"
REM Strip trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "ENV_DIR=%ROOT%\.env"
set "ENV_READY=%ENV_DIR%\.ready"
set "FNM_DIR=%ENV_DIR%\fnm"
set "NODE_VERSION=20"

echo [INFO]  Workspace: %ROOT%

REM ── sanity checks ───────────────────────────────────────────
if not exist "%ROOT%\apps\backend\package.json" (
  echo [ERROR] Backend package.json not found.
  pause & exit /b 1
)
if not exist "%ROOT%\apps\frontend\package.json" (
  echo [ERROR] Frontend package.json not found.
  pause & exit /b 1
)

REM ── first-run setup ─────────────────────────────────────────
if exist "%ENV_READY%" goto :already_ready

echo [INFO]  First-run detected — checking Node.js environment...

REM Check for a usable system Node.js (>= NODE_VERSION)
set "USE_SYSTEM_NODE=0"
where node >nul 2>&1
if %errorlevel% equ 0 (
  for /f "tokens=1 delims=." %%M in ('node -e "process.stdout.write(process.versions.node)"') do (
    set "SYS_MAJOR=%%M"
  )
  if !SYS_MAJOR! GEQ %NODE_VERSION% (
    echo [INFO]  Found system Node.js — no local install needed.
    set "USE_SYSTEM_NODE=1"
  ) else (
    echo [WARN]  System Node.js is older than required v%NODE_VERSION%.
  )
)

REM If no suitable Node.js, download fnm and use it to install Node
if "%USE_SYSTEM_NODE%"=="0" (
  echo [INFO]  Installing fnm into %FNM_DIR% ...
  if not exist "%FNM_DIR%" mkdir "%FNM_DIR%"

  REM Download fnm portable binary (single .exe, no installer needed)
  set "FNM_EXE=%FNM_DIR%\fnm.exe"
  if not exist "!FNM_EXE!" (
    curl -fsSL -o "!FNM_EXE!" "https://github.com/Schniz/fnm/releases/latest/download/fnm-windows.zip" >nul 2>&1
    if !errorlevel! neq 0 (
      echo [ERROR] Failed to download fnm. Check your internet connection.
      pause & exit /b 1
    )
    REM fnm ships as a zip; extract the exe
    powershell -NoProfile -Command ^
      "Expand-Archive -Path '!FNM_EXE!' -DestinationPath '!FNM_DIR!' -Force; ^
       Remove-Item '!FNM_EXE!'"
    REM After extraction the exe is inside the zip; move it to FNM_EXE path
    if exist "%FNM_DIR%\fnm.exe" (
      echo [INFO]  fnm extracted successfully.
    ) else (
      echo [ERROR] fnm.exe not found after extraction.
      pause & exit /b 1
    )
  )

  REM Use fnm to install Node.js and apply it for this session
  set "FNM_NODE_DIST_MIRROR=https://nodejs.org/dist"
  "%FNM_DIR%\fnm.exe" install %NODE_VERSION% --fnm-dir "%FNM_DIR%"
  if %errorlevel% neq 0 (
    echo [ERROR] fnm failed to install Node.js v%NODE_VERSION%.
    pause & exit /b 1
  )

  REM Add fnm-managed Node to PATH for this session
  for /f "tokens=*" %%P in ('"%FNM_DIR%\fnm.exe" env --shell cmd --fnm-dir "%FNM_DIR%"') do %%P
  "%FNM_DIR%\fnm.exe" use %NODE_VERSION% --fnm-dir "%FNM_DIR%"
  echo [INFO]  Node.js and npm ready via fnm.
)

REM Install npm dependencies if node_modules are absent
if not exist "%ROOT%\apps\backend\node_modules" (
  echo [INFO]  Installing backend dependencies...
  pushd "%ROOT%\apps\backend"
  call npm install
  if %errorlevel% neq 0 ( echo [ERROR] npm install failed for backend. pause & exit /b 1 )
  popd
)
if not exist "%ROOT%\apps\frontend\node_modules" (
  echo [INFO]  Installing frontend dependencies...
  pushd "%ROOT%\apps\frontend"
  call npm install
  if %errorlevel% neq 0 ( echo [ERROR] npm install failed for frontend. pause & exit /b 1 )
  popd
)

REM Write the ready flag
if not exist "%ENV_DIR%" mkdir "%ENV_DIR%"
(
  echo env_ready=%DATE% %TIME%
  echo use_system_node=%USE_SYSTEM_NODE%
) > "%ENV_READY%"
echo [INFO]  Environment setup complete. Flag written to %ENV_READY%
goto :launch

:already_ready
echo [INFO]  Environment already configured.

REM If a local fnm was installed, load its Node into PATH
if exist "%FNM_DIR%\fnm.exe" (
  for /f "tokens=*" %%P in ('"%FNM_DIR%\fnm.exe" env --shell cmd --fnm-dir "%FNM_DIR%"') do %%P
  "%FNM_DIR%\fnm.exe" use %NODE_VERSION% --fnm-dir "%FNM_DIR%" >nul 2>&1
)

:launch
REM ── Build PATH preamble for child windows ───────────────────
set "FNM_PREAMBLE="
if exist "%FNM_DIR%\fnm.exe" (
  set "FNM_PREAMBLE=for /f "tokens=*" %%P in ('"%FNM_DIR%\fnm.exe" env --shell cmd --fnm-dir "%FNM_DIR%"') do %%P && "%FNM_DIR%\fnm.exe" use %NODE_VERSION% --fnm-dir "%FNM_DIR%" >nul 2>&1 && "
)

echo [INFO]  Starting backend in a new window...
start "Backend Dev Server" cmd /k "%FNM_PREAMBLE%cd /d "%ROOT%\apps\backend" && npm run dev"

echo [INFO]  Starting frontend in a new window...
start "Frontend Dev Server" cmd /k "%FNM_PREAMBLE%cd /d "%ROOT%\apps\frontend" && npm run dev"

echo.
echo [DONE] Backend (port 3000) and frontend (port 5173) have been launched.
echo [TIP]  Close each server window to stop the service.
pause
