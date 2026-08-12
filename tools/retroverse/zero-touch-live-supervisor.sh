#!/bin/bash
# Zero-touch live supervisor. Started by the existing BobOS LaunchAgent.
# VirtualDJ remains the only authority for live song state; this process only
# ensures the existing Live + bridge processes are available when VDJ is open.
set -u

ROOT="/Users/bobhopp/RETROVERSE_PUBLIC"
DATA_ROOT="${RETROVERSE_DATA_ROOT:-${ROOT}/../RETROVERSE_DATA}"
LIVE_DIR="${DATA_ROOT}/live"
PID_FILE="${LIVE_DIR}/zero-touch-supervisor.pid"
STOP_MARKER="${LIVE_DIR}/auto-start-disabled"
LOG_FILE="${ROOT}/logs/zero-touch-live-supervisor.log"

mkdir -p "$LIVE_DIR" "$(dirname "$LOG_FILE")"
if [[ -f "$PID_FILE" ]]; then
  old_pid=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ "$old_pid" =~ ^[0-9]+$ ]] && kill -0 "$old_pid" 2>/dev/null; then
    exit 0
  fi
fi
echo "$$" > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT INT TERM

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$ROOT" || exit 72

vdj_is_open() {
  /usr/bin/pgrep -f '/Applications/VirtualDJ\.app/Contents/MacOS/VirtualDJ$' >/dev/null 2>&1
}

stop_recorded_bridge() {
  [[ -f "$LIVE_DIR/processes.json" ]] || return 0
  bridge_pid=$(/usr/bin/awk '/"pid"[[:space:]]*:/ { gsub(/[^0-9]/, "", $2); print $2; exit }' "$LIVE_DIR/processes.json")
  if [[ "$bridge_pid" =~ ^[0-9]+$ ]] && kill -0 "$bridge_pid" 2>/dev/null; then
    kill -TERM "$bridge_pid" 2>/dev/null || true
  fi
}

while true; do
  if [[ -f "$STOP_MARKER" ]]; then
    stop_recorded_bridge
    /bin/sleep 5
    continue
  fi

  if vdj_is_open; then
    # launch.ts reuses healthy Studio/Live processes and an existing bridge,
    # and starts only the missing pieces through the existing runtime helpers.
    RETROVERSE_NO_BROWSER=1 RETROVERSE_NO_STUDIO=1 RETROVERSE_DATA_ROOT="$DATA_ROOT" \
      /opt/homebrew/bin/npx --yes tsx tools/retroverse/launch.ts >> "$LOG_FILE" 2>&1 || true
  fi

  /bin/sleep 10
done
