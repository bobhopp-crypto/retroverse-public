#!/usr/bin/env bash
# Retroverse local dev reset — stop ports, clear .next, restart welcome then PUBLIC.
# Usage: bash scripts/dev-reset.sh
# Override welcome path: RETROVERSE_WELCOME_DIR=/path/to/retroverse-welcome bash scripts/dev-reset.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WELCOME_ROOT="${RETROVERSE_WELCOME_DIR:-${PUBLIC_ROOT}/../RETROVERSE_v2/apps/retroverse-welcome}"

PUBLIC_PORT="${RETROVERSE_PUBLIC_PORT:-3000}"
WELCOME_PORT="${RETROVERSE_WELCOME_PORT:-3001}"

LOG_WELCOME="${TMPDIR:-/tmp}/retroverse-welcome-dev.log"
LOG_PUBLIC="${TMPDIR:-/tmp}/retroverse-public-dev.log"

WELCOME_PID=""
PUBLIC_PID=""

log() {
  printf '%s\n' "$*"
}

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    log "  stopping port ${port} (pid(s): ${pids//$'\n'/, })"
    # shellcheck disable=SC2086
    kill -TERM ${pids} 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      # shellcheck disable=SC2086
      kill -KILL ${pids} 2>/dev/null || true
    fi
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-90}"
  local i=1
  while (( i <= attempts )); do
    if curl -sf -o /dev/null --max-time 2 "${url}" 2>/dev/null; then
      log "  ${label} ready (${url})"
      return 0
    fi
    sleep 1
    (( i += 1 ))
  done
  log "  ERROR: ${label} did not respond at ${url} within ${attempts}s"
  log "  tail log: ${LOG_WELCOME}"
  tail -n 30 "${LOG_WELCOME}" 2>/dev/null || true
  return 1
}

cleanup() {
  log ""
  log "Shutting down dev servers..."
  [[ -n "${PUBLIC_PID}" ]] && kill "${PUBLIC_PID}" 2>/dev/null || true
  [[ -n "${WELCOME_PID}" ]] && kill "${WELCOME_PID}" 2>/dev/null || true
  stop_port "${PUBLIC_PORT}"
  stop_port "${WELCOME_PORT}"
}

trap cleanup EXIT INT TERM

if [[ ! -d "${WELCOME_ROOT}" ]]; then
  log "ERROR: retroverse-welcome not found at:"
  log "  ${WELCOME_ROOT}"
  log "Set RETROVERSE_WELCOME_DIR to the correct path."
  exit 1
fi

if [[ ! -f "${PUBLIC_ROOT}/package.json" ]]; then
  log "ERROR: RETROVERSE_PUBLIC package.json missing at ${PUBLIC_ROOT}"
  exit 1
fi

log "[1/5] Stopping existing processes..."
stop_port "${PUBLIC_PORT}"
stop_port "${WELCOME_PORT}"

log "[2/5] Clearing .next and webpack caches..."
rm -rf "${PUBLIC_ROOT}/.next"
rm -rf "${PUBLIC_ROOT}/node_modules/.cache"
rm -rf "${WELCOME_ROOT}/.next"
rm -rf "${WELCOME_ROOT}/node_modules/.cache"
log "  removed ${PUBLIC_ROOT}/.next"
log "  removed ${PUBLIC_ROOT}/node_modules/.cache"
log "  removed ${WELCOME_ROOT}/.next"
log "  removed ${WELCOME_ROOT}/node_modules/.cache"

log "[3/5] Starting welcome backend (port ${WELCOME_PORT})..."
: >"${LOG_WELCOME}"
(
  cd "${WELCOME_ROOT}"
  export PORT="${WELCOME_PORT}"
  exec npm run dev
) >>"${LOG_WELCOME}" 2>&1 &
WELCOME_PID=$!
log "  welcome pid ${WELCOME_PID} · log ${LOG_WELCOME}"

wait_for_http "http://127.0.0.1:${WELCOME_PORT}/api/home-search?q=__dev_reset__" "welcome backend" || exit 1

log "[4/5] Starting PUBLIC frontend (port ${PUBLIC_PORT})..."
: >"${LOG_PUBLIC}"
(
  cd "${PUBLIC_ROOT}"
  export PORT="${PUBLIC_PORT}"
  exec npm run dev
) >>"${LOG_PUBLIC}" 2>&1 &
PUBLIC_PID=$!
log "  public pid ${PUBLIC_PID} · log ${LOG_PUBLIC}"

wait_for_http "http://127.0.0.1:${PUBLIC_PORT}/" "PUBLIC frontend" || exit 1

log "[5/5] Retroverse ready."
log ""
log "  PUBLIC:   http://127.0.0.1:${PUBLIC_PORT}/"
log "  Welcome:  http://127.0.0.1:${WELCOME_PORT}/"
log "  Search:   http://127.0.0.1:${PUBLIC_PORT}/search?q=eagles"
log "  Logs:     ${LOG_PUBLIC}"
log "            ${LOG_WELCOME}"
log ""

if command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:${PUBLIC_PORT}/control-center" 2>/dev/null || true
  log "  opened control-center in browser"
fi

log "Press Ctrl+C to stop both servers."
wait "${WELCOME_PID}" "${PUBLIC_PID}" 2>/dev/null || wait
