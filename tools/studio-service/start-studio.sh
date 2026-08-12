#!/bin/bash
set -u

readonly REPO_ROOT="/Users/bobhopp/RETROVERSE_PUBLIC"
readonly NODE_BIN="/opt/homebrew/bin/node"
readonly PORT="3000"
readonly LOG_DIR="${REPO_ROOT}/logs"
readonly PID_FILE="${LOG_DIR}/studio-service.pid"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PORT
export HOSTNAME="0.0.0.0"
export RETROVERSE_DEV_OWNER="com.bobos.studio"

mkdir -p "${LOG_DIR}"
cd "${REPO_ROOT}" || {
  echo "[studio-service] Cannot enter ${REPO_ROOT}." >&2
  exit 72
}

# LaunchAgents do not inherit the interactive shell environment. Load the
# repository's existing local environment so managed Studio uses the same
# RETROVERSE_PG_* configuration as the rest of the project. The file remains
# the only credential source; values are never copied into this script/plist.
if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

# Keep the existing LaunchAgent as the single startup authority. The helper
# supervises only Live/VDJ when VirtualDJ is open; it does not create song
# state and respects Runtime's manual-stop marker.
DATA_ROOT="${RETROVERSE_DATA_ROOT:-${REPO_ROOT}/../RETROVERSE_DATA}"
SUPERVISOR_PID_FILE="${DATA_ROOT}/live/zero-touch-supervisor.pid"
if [[ -f "${SUPERVISOR_PID_FILE}" ]] && /bin/kill -0 "$(/bin/cat "${SUPERVISOR_PID_FILE}")" 2>/dev/null; then
  :
else
  /usr/bin/nohup "${REPO_ROOT}/tools/retroverse/zero-touch-live-supervisor.sh" >/dev/null 2>&1 &
fi

if [[ ! -x "${NODE_BIN}" ]]; then
  echo "[studio-service] Node is unavailable at ${NODE_BIN}." >&2
  exit 72
fi

# A listener may briefly remain while launchd is restarting the service. Wait
# for it instead of starting a duplicate or creating a rapid restart loop.
if /usr/sbin/lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[studio-service] Port ${PORT} is already listening; waiting for it to become free."
  while /usr/sbin/lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
    /bin/sleep 5
  done
  echo "[studio-service] Port ${PORT} is free; starting Studio."
fi

echo "$$" > "${PID_FILE}"
echo "[studio-service] Starting BobOS Studio on 0.0.0.0:${PORT}."
exec "${NODE_BIN}" "${REPO_ROOT}/tools/next-dev.mjs" --app studio
