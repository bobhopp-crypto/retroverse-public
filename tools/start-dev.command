#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
export RETROVERSE_DEV_NO_CLEAN=1
echo "Starting Retroverse dev server on http://localhost:3000"
echo "Press Ctrl+C to stop."
npm run dev
