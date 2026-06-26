#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="${ROOT}/../../.venv-allstar"
SCANS="${1:-/Users/bobhopp/Documents/All Star Baseball/Scans}"
OUT="${ROOT}/output"
SCAN_FILE="${2:-}"

if [[ ! -x "${VENV}/bin/python" ]]; then
  python3 -m venv "${VENV}"
  "${VENV}/bin/pip" install -r "${ROOT}/requirements.txt"
fi

mkdir -p "${OUT}/review"

if [[ -n "${SCAN_FILE}" ]]; then
  echo "Processing single scan: ${SCAN_FILE}"
  echo "Output: ${OUT}"
  "${VENV}/bin/python" "${ROOT}/disc_extractor.py" --scan "${SCAN_FILE}" --output "${OUT}" --project-root "${ROOT}/../.."
elif [[ "${3:-}" == "queue" ]]; then
  echo "Running preservation queue from: ${SCANS}"
  echo "Output: ${OUT}"
  "${VENV}/bin/python" "${ROOT}/disc_extractor.py" --queue --scans "${SCANS}" --output "${OUT}" --project-root "${ROOT}/../.."
else
  echo "Processing scans from: ${SCANS}"
  echo "Output: ${OUT}"
  "${VENV}/bin/python" "${ROOT}/disc_extractor.py" --scans "${SCANS}" --output "${OUT}" --project-root "${ROOT}/../.."
fi
