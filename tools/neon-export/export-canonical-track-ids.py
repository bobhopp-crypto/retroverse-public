#!/usr/bin/env python3
"""Save canonical/graph/family numeric IDs needed by the operator inventory."""
import gzip
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
values = {}
for line in Path('/Users/bobhopp/RETROVERSE_PUBLIC/.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        values[key] = value.strip().strip('"').strip("'")
env = os.environ.copy()
for suffix in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD'):
    env['PG' + suffix] = values['RETROVERSE_PASS_PG_' + suffix]
env['PGSSLMODE'] = 'require' if values.get('RETROVERSE_PASS_PG_SSL') != '0' else 'disable'
query = """
SELECT row_to_json(x) FROM (
 SELECT upper(trim(track_id)) AS rvtr, id AS canonical_track_id, canonical_title,
        graph_track_id, track_family_id
 FROM canonical_track_display
 WHERE upper(trim(track_id)) ~ '^RVTR[0-9]{6}$'
 ORDER BY track_id
) x
"""
result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query],
                        env=env, capture_output=True, check=True, timeout=300)
rows = [json.loads(line) for line in result.stdout.splitlines() if line]
index = {row.pop('rvtr'): row for row in rows}
if len(index) < 41000:
    raise RuntimeError(f'Canonical track ID export unexpectedly small: {len(index)}')
target = root / 'data/static-graph/canonical-track-ids.json.gz'
target.write_bytes(gzip.compress(json.dumps(index, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(target.read_bytes()))) != len(index):
    raise RuntimeError('Canonical track ID round-trip failed')
print(f'preserved {len(index)} canonical track IDs')
