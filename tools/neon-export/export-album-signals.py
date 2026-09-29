#!/usr/bin/env python3
"""Export Billboard 200 signals used by public search ranking."""
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
env['PGSSLMODE'] = 'require'
query = """
WITH chart AS (
 SELECT album_id,
  min(chart_position) FILTER (WHERE chart_name = 'Billboard 200') AS peak,
  count(*) FILTER (WHERE chart_name = 'Billboard 200')::int AS weeks
 FROM chart_appearances GROUP BY album_id
)
SELECT row_to_json(x) FROM (
 SELECT DISTINCT ON (upper(trim(aek.external_key)))
  upper(trim(aek.external_key)) AS rval, chart.peak, coalesce(chart.weeks, 0) AS weeks
 FROM album_external_keys aek
 JOIN albums al ON al.id = aek.album_id
 LEFT JOIN chart ON chart.album_id = al.id
 WHERE upper(trim(aek.external_key)) ~ '^RVAL[0-9]{6}$'
 ORDER BY upper(trim(aek.external_key)), aek.confidence_score DESC NULLS LAST, aek.created_at ASC
) x
"""
result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], env=env, capture_output=True, check=True)
rows = [json.loads(line) for line in result.stdout.splitlines() if line]
if len(rows) < 21000:
    raise RuntimeError(f'album signal export unexpectedly small: {len(rows)}')
target = root / 'data/static-graph/album-signals.json.gz'
target.write_bytes(gzip.compress(json.dumps(rows, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(target.read_bytes()))) != len(rows):
    raise RuntimeError('album signal round-trip failed')
print(f'album signals: {len(rows)} records, {target.stat().st_size} bytes')
