#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Portfolio Dashboard — Start Script
# Starts FastAPI backend on :8765 + React dev server (auto-selects port)
# ─────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"
FRONTEND="$SCRIPT_DIR/frontend"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    PORTFOLIO INTELLIGENCE DASHBOARD                  ║"
echo "║    Srinivasan Household · Tamarac Advisory           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Create/verify Python venv ─────────────────────────────────────────────
if [ ! -f "$VENV/bin/uvicorn" ]; then
  echo "→ Setting up Python virtual environment..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q fastapi "uvicorn[standard]" yfinance pandas python-multipart
  echo "  ✓ Dependencies installed"
fi

# ── 2. Install npm deps if needed ────────────────────────────────────────────
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "→ Installing frontend npm packages..."
  cd "$FRONTEND" && npm install --silent
fi

# ── 3. Kill any old instances ─────────────────────────────────────────────────
pkill -f "uvicorn" 2>/dev/null || true
sleep 1

# ── 4. Start backend ──────────────────────────────────────────────────────────
echo "→ Starting FastAPI backend on http://localhost:8765 ..."
cd "$SCRIPT_DIR"
"$VENV/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8765 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 2

# ── 5. Health check ───────────────────────────────────────────────────────────
echo "→ Checking backend health..."
for i in {1..5}; do
  if curl -sf http://localhost:8765/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend is up"
    break
  fi
  sleep 1
done

# ── 6. Start frontend dev server ──────────────────────────────────────────────
echo "→ Starting React dev server (will auto-select available port)..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

sleep 2
echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  Dashboard ready!                                   │"
echo "│                                                     │"
echo "│  → Open:  http://localhost:5173 (or next open port) │"
echo "│  → API:   http://localhost:8765/docs                │"
echo "│                                                     │"
echo "│  Press Ctrl+C to stop both servers                  │"
echo "└─────────────────────────────────────────────────────┘"
echo ""

# ── 7. Cleanup on exit ───────────────────────────────────────────────────────
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
