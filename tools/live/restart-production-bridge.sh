#!/usr/bin/env bash
# Restart VDJ OSC bridge → production live state (no local dev server).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${LIVE_NOW_PLAYING_URL:?Set LIVE_NOW_PLAYING_URL in .env.local}"
: "${LIVE_NOW_PLAYING_SECRET:?Set LIVE_NOW_PLAYING_SECRET in .env.local}"
: "${RETROVERSE_DATA_ROOT:=$(cd ../RETROVERSE_DATA 2>/dev/null && pwd || echo "$ROOT/../RETROVERSE_DATA")}"

pkill -f "tsx tools/live-bridge/index.ts" 2>/dev/null || true
sleep 1

LOG="$RETROVERSE_DATA_ROOT/live/bridge-stdout.log"
mkdir -p "$(dirname "$LOG")"

nohup npx tsx tools/live-bridge/index.ts >>"$LOG" 2>&1 &
echo "Bridge started pid $! → $LIVE_NOW_PLAYING_URL"
echo "Log: $LOG"
