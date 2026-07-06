#!/usr/bin/env bash
#
# Retroverse Launcher — the ONLY supported way to start Retroverse before a show.
#
# Stops any existing Studio / Live / VDJ Bridge, clears stale dev state, starts
# everything clean, waits for health, starts the bridge, verifies, and opens
# Studio + Live in the browser with a cache-busted Live URL so no stale client
# bundle can survive the restart.
#
# Reuses existing startup commands only:
#   - tools/dev-server/runtime-lifecycle.mjs  (stop)
#   - tools/next-dev.mjs --app studio|live    (start — same command runtime-control.mjs uses)
#   - npm run vdj-bridge                      (tools/live-bridge/index.ts)
#
# Usage: tools/launch-retroverse.sh
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STUDIO_PORT=3000
LIVE_PORT=3100
STUDIO_HEALTH_URL="http://127.0.0.1:${STUDIO_PORT}/bobos"
LIVE_HEALTH_URL="http://127.0.0.1:${LIVE_PORT}/"
STUDIO_OPEN_URL="http://localhost:${STUDIO_PORT}/bobos"

# LAN IP can drift between sessions (DHCP) — auto-detect, fall back to the
# last-known address, and allow an explicit override via env.
detect_lan_ip() {
  if [ -n "${RETROVERSE_LAN_IP:-}" ]; then
    echo "$RETROVERSE_LAN_IP"
    return
  fi
  local ip
  ip=$(ipconfig getifaddr en0 2>/dev/null)
  if [ -z "$ip" ]; then ip=$(ipconfig getifaddr en1 2>/dev/null); fi
  echo "${ip:-192.168.68.54}"
}
LAN_IP="$(detect_lan_ip)"
LIVE_OPEN_URL="http://${LAN_IP}:${LIVE_PORT}/live"

LOG_DIR="$REPO_ROOT/logs"
STUDIO_LOG="$LOG_DIR/launcher-studio.log"
LIVE_LOG="$LOG_DIR/launcher-live.log"
BRIDGE_LOG="$LOG_DIR/launcher-vdj-bridge.log"
DATA_ROOT="${RETROVERSE_DATA_ROOT:-$REPO_ROOT/../RETROVERSE_DATA}"
BRIDGE_MANIFEST="$DATA_ROOT/live/processes.json"

mkdir -p "$LOG_DIR" "$DATA_ROOT/live"

step() { echo ""; echo "── [$(date "+%H:%M:%S")] $1 ──"; }
ok()   { echo "  ✅ $1"; }
warn() { echo "  ⚠️  $1"; }
fail() { echo "  ❌ $1"; }

wait_for_port_free() {
  local port="$1"
  for _ in $(seq 1 20); do
    if ! lsof -ti tcp:"$port" -sTCP:LISTEN >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 1
}

wait_for_health() {
  local url="$1" timeout="$2" waited=0 code
  while [ "$waited" -lt "$timeout" ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 "$url" 2>/dev/null || echo 000)
    if [ "$code" != "000" ] && [ "$code" -lt 500 ]; then return 0; fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

# Close any Safari tab still pointing at the old Live port — prevents a stale
# dev-bundle tab from surviving the restart. Best-effort: never blocks launch.
close_stale_live_tabs() {
  osascript >/dev/null 2>&1 <<APPLESCRIPT
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in (tabs of w)
        try
          if (URL of t) contains ":${LIVE_PORT}" then close t
        end try
      end repeat
    end repeat
  end if
end tell
APPLESCRIPT
}

echo "════════════════════════════════════════════════"
echo " RETROVERSE LAUNCHER"
echo "════════════════════════════════════════════════"

step "1-3 · Stopping any existing Studio / Live / VDJ Bridge"
node tools/dev-server/runtime-lifecycle.mjs stop
if pkill -f "tools/live-bridge/index.ts" 2>/dev/null; then
  ok "Stopped VDJ Bridge process"
else
  ok "No VDJ Bridge process was running"
fi

wait_for_port_free "$STUDIO_PORT" && ok "Port $STUDIO_PORT free" || warn "Port $STUDIO_PORT still occupied (foreign process — not killed)"
wait_for_port_free "$LIVE_PORT" && ok "Port $LIVE_PORT free" || warn "Port $LIVE_PORT still occupied (foreign process — not killed)"

step "4 · Clearing stale development state"
for suffix in "" "-live"; do
  marker="$REPO_ROOT/.retroverse-dev-active${suffix}"
  if [ -f "$marker" ]; then
    rm -f "$marker"
    ok "Removed stale dev marker: $(basename "$marker")"
  fi
done
rm -f "$BRIDGE_MANIFEST"
ok "Cleared VDJ Bridge process manifest"
echo "     (.next / webpack caches are cleared automatically by tools/next-dev.mjs on start)"

step "5 · Starting Studio"
: > "$STUDIO_LOG"
RETROVERSE_DEV_OWNER="bobos-runtime" PORT="$STUDIO_PORT" \
  nohup node tools/next-dev.mjs --app studio >> "$STUDIO_LOG" 2>&1 &
disown
ok "Studio launcher spawned (log: $STUDIO_LOG)"

step "6 · Waiting for Studio to respond ($STUDIO_HEALTH_URL)"
if wait_for_health "$STUDIO_HEALTH_URL" 90; then
  ok "Studio healthy"
else
  fail "Studio did not respond in time — check $STUDIO_LOG"
  exit 1
fi

step "7 · Starting Live"
: > "$LIVE_LOG"
RETROVERSE_DEV_OWNER="bobos-runtime" RETROVERSE_DEV_MARKER_SUFFIX="-live" PORT="$LIVE_PORT" \
  nohup node tools/next-dev.mjs --app live >> "$LIVE_LOG" 2>&1 &
disown
ok "Live launcher spawned (log: $LIVE_LOG)"

step "8 · Waiting for Live to respond ($LIVE_HEALTH_URL)"
if wait_for_health "$LIVE_HEALTH_URL" 90; then
  ok "Live healthy"
else
  fail "Live did not respond in time — check $LIVE_LOG"
  exit 1
fi

step "9 · Starting VDJ Bridge"
: > "$BRIDGE_LOG"
nohup npm run vdj-bridge >> "$BRIDGE_LOG" 2>&1 &
BRIDGE_PID=$!
disown
sleep 2
if kill -0 "$BRIDGE_PID" 2>/dev/null; then
  ok "VDJ Bridge running (pid $BRIDGE_PID, log: $BRIDGE_LOG)"
  cat > "$BRIDGE_MANIFEST" <<JSON
{
  "version": 1,
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "projectRoot": "$REPO_ROOT",
  "port": $LIVE_PORT,
  "baseUrl": "http://127.0.0.1:$LIVE_PORT",
  "vdjPort": "",
  "dev": null,
  "bridge": { "pid": $BRIDGE_PID, "spawned": true }
}
JSON
  ok "Bridge manifest written — Runtime widget will report it healthy"
else
  fail "VDJ Bridge exited immediately — check $BRIDGE_LOG"
fi

step "10 · Final health verification"
STUDIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 "$STUDIO_HEALTH_URL" 2>/dev/null || echo 000)
LIVE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 "$LIVE_HEALTH_URL" 2>/dev/null || echo 000)
echo "  Studio : HTTP $STUDIO_CODE"
echo "  Live   : HTTP $LIVE_CODE"
if kill -0 "$BRIDGE_PID" 2>/dev/null; then
  echo "  Bridge : running (pid $BRIDGE_PID)"
else
  echo "  Bridge : NOT RUNNING"
fi

step "11-12 · Opening browser (forcing a fresh Live client bundle)"
close_stale_live_tabs
BOOT_ID="$(date +%s)"
open -a Safari "$STUDIO_OPEN_URL"
sleep 1
open -a Safari "${LIVE_OPEN_URL}?boot=${BOOT_ID}"
ok "Opened $STUDIO_OPEN_URL"
ok "Opened ${LIVE_OPEN_URL}?boot=${BOOT_ID} (new tab, cache-busted — fresh bundle guaranteed)"

echo ""
echo "════════════════════════════════════════════════"
if [ "$STUDIO_CODE" -lt 500 ] 2>/dev/null && [ "$LIVE_CODE" -lt 500 ] 2>/dev/null && kill -0 "$BRIDGE_PID" 2>/dev/null; then
  echo " READY TO DJ"
else
  echo " LAUNCH FINISHED WITH WARNINGS — review the checks above"
fi
echo "════════════════════════════════════════════════"
echo " Studio: $STUDIO_OPEN_URL"
echo " Live:   $LIVE_OPEN_URL"
echo ""
