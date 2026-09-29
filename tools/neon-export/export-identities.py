#!/usr/bin/env python3
"""Export artist and album identity maps used by public routes."""
import gzip
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
variables = {}
for line in Path('/Users/bobhopp/RETROVERSE_PUBLIC/.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        variables[key] = value.strip().strip('"').strip("'")
env = os.environ.copy()
for suffix in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD'):
    env['PG' + suffix] = variables['RETROVERSE_PASS_PG_' + suffix]
env['PGSSLMODE'] = 'require'

def export(name: str, query: str, minimum: int):
    result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], env=env, capture_output=True, check=True)
    rows = [json.loads(line) for line in result.stdout.splitlines() if line]
    if len(rows) < minimum:
        raise RuntimeError(f'{name} export unexpectedly small: {len(rows)}')
    target = root / f'data/static-graph/{name}.json.gz'
    target.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(rows, separators=(',', ':'), ensure_ascii=False).encode()
    target.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    if len(json.loads(gzip.decompress(target.read_bytes()))) != len(rows):
        raise RuntimeError(f'{name} round-trip failed')
    print(f'{name}: {len(rows)} records, {target.stat().st_size} compressed bytes')

export('artist-identities', "SELECT row_to_json(a) FROM (SELECT id, upper(trim(rvar)) AS rvar, canonical_name FROM artists WHERE upper(trim(rvar)) ~ '^RVAR[0-9]{6}$' ORDER BY id) a", 8000)
export('album-identities', """
SELECT row_to_json(a) FROM (
 SELECT DISTINCT ON (upper(trim(aek.external_key)))
  upper(trim(aek.external_key)) AS rval,
  al.id AS album_id, al.artist_id, ar.rvar AS artist_rvar,
  al.title, al.release_year, ar.canonical_name AS artist_name,
  al.canonical_cover_path AS cover_path,
  (SELECT aal.canonical_cover_path FROM album_artwork_links aal WHERE aal.album_id = al.id
   ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST, aal.updated_at DESC NULLS LAST, aal.id DESC LIMIT 1) AS artwork_path,
  (SELECT aal.r2_cover_key FROM album_artwork_links aal WHERE aal.album_id = al.id
   ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST, aal.updated_at DESC NULLS LAST, aal.id DESC LIMIT 1) AS r2_cover_key
 FROM album_external_keys aek
 JOIN albums al ON al.id = aek.album_id
 JOIN artists ar ON ar.id = al.artist_id
 WHERE upper(trim(aek.external_key)) ~ '^RVAL[0-9]{6}$'
 ORDER BY upper(trim(aek.external_key)), aek.confidence_score DESC NULLS LAST, aek.created_at ASC
) a
""", 10000)
