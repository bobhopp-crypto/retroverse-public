#!/bin/bash
set -euo pipefail

ROOT="/Users/bobhopp/RETROVERSE_PUBLIC"
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}/local"
LOG_DIR="${ROOT}/logs"
LOG_FILE="${LOG_DIR}/local-studio-dev.log"

cd "$ROOT"
mkdir -p "$LOG_DIR"

server_up() {
  curl -sf "http://127.0.0.1:${PORT}/" -o /dev/null 2>/dev/null
}

echo "Retroverse Local Studio launcher"
echo "Project: ${ROOT}"

if server_up; then
  echo "Dev server already responding on port ${PORT}."
else
  echo "Starting dev server (RETROVERSE_OPS=1)..."
  export RETROVERSE_OPS=1
  nohup npm run dev >>"${LOG_FILE}" 2>&1 &
  echo "Logging to ${LOG_FILE}"
fi

echo "Waiting for http://localhost:${PORT} ..."
for _ in $(seq 1 120); do
  if server_up; then
    break
  fi
  sleep 1
done

if ! server_up; then
  echo "Dev server did not become ready within 120 seconds."
  echo "Check ${LOG_FILE}"
  exit 1
fi

echo "Opening ${URL}"
open "${URL}"
