#!/usr/bin/env python3
"""Export the public search materialized view as a checked-in static index."""
import gzip
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = Path('/Users/bobhopp/RETROVERSE_PUBLIC/.env.local')
values = {}
for line in source.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        values[key] = value.strip().strip('"').strip("'")
env = os.environ.copy()
for suffix in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD'):
    env['PG' + suffix] = values['RETROVERSE_PASS_PG_' + suffix]
env['PGSSLMODE'] = 'require'
query = "SELECT row_to_json(se) FROM search_entities se ORDER BY entity_type, normalized_label, label"
process = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], env=env, capture_output=True, check=True)
rows = [json.loads(line) for line in process.stdout.splitlines() if line]
if len(rows) < 79000:
    raise SystemExit(f'index unexpectedly small: {len(rows)}')
target = root / 'data/static-graph/search-entities.json.gz'
target.parent.mkdir(parents=True, exist_ok=True)
raw = json.dumps(rows, separators=(',', ':'), ensure_ascii=False).encode()
target.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(target.read_bytes()))) != len(rows):
    raise SystemExit('static search round-trip failed')
print(f'exported {len(rows)} search entities ({target.stat().st_size} compressed bytes)')
