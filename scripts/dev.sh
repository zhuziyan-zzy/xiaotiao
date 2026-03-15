#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/xiaotiao-server"
APP_DIR="$ROOT_DIR/xiaotiao-app"

BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

choose_python() {
  if [[ -x "$SERVER_DIR/.venv/bin/python" ]] && "$SERVER_DIR/.venv/bin/python" - <<'PY' >/dev/null 2>&1; then
import fastapi
print("ok")
PY
    echo "$SERVER_DIR/.venv/bin/python"
    return
  fi

  if [[ -x "/Users/mac/学习/小挑/xiaotiao-v1/.venv/bin/python" ]] && /Users/mac/学习/小挑/xiaotiao-v1/.venv/bin/python - <<'PY' >/dev/null 2>&1; then
import fastapi
print("ok")
PY
    echo "/Users/mac/学习/小挑/xiaotiao-v1/.venv/bin/python"
    return
  fi

  echo "python3"
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

PY_BIN="$(choose_python)"
echo "[dev] python runtime: $PY_BIN"

"$PY_BIN" -m uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload --app-dir "$SERVER_DIR" &
BACKEND_PID=$!

if [[ ! -d "$APP_DIR/node_modules" ]]; then
  (cd "$APP_DIR" && npm install)
fi

(cd "$APP_DIR" && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

echo "[dev] backend: http://127.0.0.1:$BACKEND_PORT"
echo "[dev] frontend: http://127.0.0.1:$FRONTEND_PORT (if occupied, Vite will auto-switch)"

wait
