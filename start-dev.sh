#!/bin/bash
# One-click starter for backend and frontend dev servers (macOS)
# On first run: detects Node.js environment; if missing, installs nvm + Node.js
#               into a local .env directory, then installs npm dependencies.
# On subsequent runs: skips all setup and launches services directly.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_DIR="$ROOT/.env"           # local virtual environment (nvm home)
ENV_READY_FLAG="$ENV_DIR/.ready"  # marker file written after successful setup
NODE_VERSION="20"              # LTS major version to install via nvm

# ── colour helpers ────────────────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; }

# ── sanity checks ─────────────────────────────────────────────────────────────
if [ ! -f "$ROOT/apps/backend/package.json" ]; then
  error "Backend package.json not found: $ROOT/apps/backend/package.json"
  exit 1
fi

if [ ! -f "$ROOT/apps/frontend/package.json" ]; then
  error "Frontend package.json not found: $ROOT/apps/frontend/package.json"
  exit 1
fi

# ── environment setup (first-run only) ────────────────────────────────────────
if [ ! -f "$ENV_READY_FLAG" ]; then
  info "First-run detected — checking Node.js environment..."

  # Prefer system Node.js if it satisfies the required major version
  SYSTEM_NODE=""
  if command -v node &>/dev/null; then
    NODE_MAJOR="$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')"
    if [ "$NODE_MAJOR" -ge "$NODE_VERSION" ] 2>/dev/null; then
      SYSTEM_NODE="$(command -v node)"
      info "Found system Node.js $(node --version) — no virtual environment needed."
    else
      warn "System Node.js $(node --version) is older than required v${NODE_VERSION}."
    fi
  fi

  if [ -z "$SYSTEM_NODE" ]; then
    info "Installing nvm + Node.js v${NODE_VERSION} into $ENV_DIR ..."
    mkdir -p "$ENV_DIR"

    # Install nvm into ENV_DIR (no shell profile modification needed)
    export NVM_DIR="$ENV_DIR/nvm"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \
      | NVM_DIR="$NVM_DIR" PROFILE=/dev/null bash

    # Load nvm
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"

    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"
    info "Node.js $(node --version) and npm $(npm --version) ready."
  fi

  # Install npm dependencies if node_modules are absent
  if [ ! -d "$ROOT/apps/backend/node_modules" ]; then
    info "Installing backend dependencies..."
    (cd "$ROOT/apps/backend" && npm install)
  fi

  if [ ! -d "$ROOT/apps/frontend/node_modules" ]; then
    info "Installing frontend dependencies..."
    (cd "$ROOT/apps/frontend" && npm install)
  fi

  # Write the ready flag so subsequent runs skip all of the above
  mkdir -p "$ENV_DIR"
  echo "env_ready=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ENV_READY_FLAG"
  echo "node=$(node --version)" >> "$ENV_READY_FLAG"
  echo "npm=$(npm --version)"   >> "$ENV_READY_FLAG"
  info "Environment setup complete. Flag written to $ENV_READY_FLAG"
else
  info "Environment already configured ($(grep env_ready "$ENV_READY_FLAG" | cut -d= -f2))."

  # If we installed a local nvm previously, load it so PATH is correct
  NVM_DIR="$ENV_DIR/nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    nvm use default --silent
  fi
fi

# ── launch services in separate Terminal windows ───────────────────────────────
# Build the shell preamble that loads nvm (if local) so the new window has PATH
NVM_PREAMBLE=""
if [ -s "$ENV_DIR/nvm/nvm.sh" ]; then
  NVM_PREAMBLE="export NVM_DIR='$ENV_DIR/nvm'; source \"\$NVM_DIR/nvm.sh\"; nvm use default --silent; "
fi

# Robust launcher: try to open Terminal.app via osascript; if that fails, start
# the service in the background with nohup and redirect logs. This avoids
# brittle quoting issues and works on headless or limited environments.
open_or_launch() {
  local label="$1"
  local workdir="$2"
  local cmd="$3"
  local logfile="$4"

  # Try macOS Terminal via AppleScript if available
  if command -v osascript &>/dev/null; then
    # Escape backslashes and double quotes for safe embedding in AppleScript
    local escaped_cmd
    escaped_cmd=$(printf '%s' "$cmd" | sed -e 's/\\/\\\\/g' -e 's/"/\\\"/g')

    if osascript -e "tell application \"Terminal\" to do script \"${escaped_cmd}\"" 2>/dev/null; then
      info "$label launched in Terminal.app"
      return 0
    else
      warn "osascript failed to open Terminal.app for $label — falling back to background launch"
    fi
  else
    warn "osascript not found — falling back to background launch for $label"
  fi

  # Ensure logs dir exists
  mkdir -p "$ENV_DIR/logs"

  # Create a small wrapper script to ensure the command runs with the proper
  # environment and quoting. Using a wrapper avoids complex remote quoting.
  local wrapper="$ENV_DIR/logs/${label// /_}.sh"
  cat > "$wrapper" <<EOF
#!/usr/bin/env bash
set -euo pipefail
# Load local nvm if present
if [ -s "$ENV_DIR/nvm/nvm.sh" ]; then
  export NVM_DIR="$ENV_DIR/nvm"
  # shellcheck source=/dev/null
  source "$ENV_DIR/nvm/nvm.sh"
  nvm use default --silent || true
fi
cd "$workdir"
exec bash -lc "$cmd"
EOF
  chmod +x "$wrapper"

  nohup "$wrapper" > "$ENV_DIR/logs/$logfile" 2>&1 &
  local pid=$!
  info "$label started in background (pid $pid). Logs: $ENV_DIR/logs/$logfile"
}

# Ensure logs directory exists for fallback runs
mkdir -p "$ENV_DIR/logs"

info "Starting backend in a new Terminal window (or background)..."
open_or_launch "Backend" "$ROOT/apps/backend" "${NVM_PREAMBLE}cd '$ROOT/apps/backend' && npm run dev" "backend.log"

info "Starting frontend in a new Terminal window (or background)..."
open_or_launch "Frontend" "$ROOT/apps/frontend" "${NVM_PREAMBLE}cd '$ROOT/apps/frontend' && npm run dev" "frontend.log"

echo ""
echo "[DONE] Backend (port 3000) and frontend (port 5173) have been launched."
echo "[TIP]  Close each Terminal window to stop the service (or kill the background pids)."
