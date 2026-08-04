#!/bin/bash
# One-click starter for backend and frontend dev servers (macOS)

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[INFO] Workspace: $ROOT"

if [ ! -f "$ROOT/apps/backend/package.json" ]; then
  echo "[ERROR] Backend package.json not found: $ROOT/apps/backend/package.json"
  exit 1
fi

if [ ! -f "$ROOT/apps/frontend/package.json" ]; then
  echo "[ERROR] Frontend package.json not found: $ROOT/apps/frontend/package.json"
  exit 1
fi

if [ ! -d "$ROOT/apps/backend/node_modules" ]; then
  echo "[WARN] Backend dependencies may be missing. Run: cd apps/backend && npm install"
fi

if [ ! -d "$ROOT/apps/frontend/node_modules" ]; then
  echo "[WARN] Frontend dependencies may be missing. Run: cd apps/frontend && npm install"
fi

echo "[INFO] Starting backend in a new Terminal tab..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/backend' && npm run dev\""

echo "[INFO] Starting frontend in a new Terminal tab..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/frontend' && npm run dev\""

echo "[DONE] Backend and frontend start commands have been launched."
echo "[TIP] Close each Terminal window to stop the service."
