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

info "Starting backend in a new Terminal window..."
osascript -e "tell application \"Terminal\" to do script \"${NVM_PREAMBLE}cd '$ROOT/apps/backend' && npm run dev\""

info "Starting frontend in a new Terminal window..."
osascript -e "tell application \"Terminal\" to do script \"${NVM_PREAMBLE}cd '$ROOT/apps/frontend' && npm run dev\""

echo ""
echo "[DONE] Backend (port 3000) and frontend (port 5173) have been launched."
echo "[TIP]  Close each Terminal window to stop the service."
