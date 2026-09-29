#!/usr/bin/env python3
"""Preserve previously published public broadcast images as static read-only data."""
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
query = "SELECT row_to_json(x) FROM (SELECT key,value FROM sunday_nights_state WHERE key LIKE 'broadcast-media:%' ORDER BY key) x"
result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query],
                        env=env, capture_output=True, check=True, timeout=300)
rows = [json.loads(line) for line in result.stdout.splitlines() if line]
media = {row['key']: row['value'] for row in rows}
if len(media) < 60 or any(not v.get('dataBase64') or not v.get('contentType') for v in media.values()):
    raise RuntimeError('Broadcast media export is incomplete')
target = root / 'data/static-graph/broadcast-media.json.gz'
target.write_bytes(gzip.compress(json.dumps(media, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(target.read_bytes()))) != len(media):
    raise RuntimeError('Broadcast media round-trip failed')
print(f'preserved {len(media)} public broadcast media records; {target.stat().st_size} compressed bytes')
