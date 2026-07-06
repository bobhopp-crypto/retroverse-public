#!/bin/bash
# RV 00-00 Retroverse — platform entrypoint. Double-click to start everything.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

echo "RETROVERSE"
echo "=========="
echo ""

npx --yes tsx tools/retroverse/launch.ts
STATUS=$?

echo ""
if [ $STATUS -eq 0 ]; then
  echo "Done. You can close this window."
else
  echo "Retroverse did not start cleanly — see the messages above."
  echo "Log: logs/retroverse-startup.log"
fi
echo ""
echo "Press Enter to close this window..."
read -r _ || true
exit $STATUS
