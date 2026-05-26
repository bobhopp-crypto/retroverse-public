#!/usr/bin/env bash
# Apply search_entities matview + pg_trgm (local or Neon via RETROVERSE_PG_*).
set -euo pipefail

HOST="${RETROVERSE_PG_HOST:-localhost}"
PORT="${RETROVERSE_PG_PORT:-5432}"
DB="${RETROVERSE_PG_DATABASE:-retroverse}"
USER="${RETROVERSE_PG_USER:-bobhopp}"

export PGPASSWORD="${RETROVERSE_PG_PASSWORD:-}"
if [[ "$HOST" != "localhost" && "$HOST" != "127.0.0.1" ]]; then
  export PGSSLMODE="${RETROVERSE_PG_SSLMODE:-require}"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$ROOT/tools/sql/search_entities.sql"
