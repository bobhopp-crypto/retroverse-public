#!/usr/bin/env python3
"""Export full per-artist album lists, including albums without RVAL keys."""
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
 SELECT album_id, min(chart_position) FILTER (WHERE chart_name='Billboard 200') AS b200_peak
 FROM chart_appearances GROUP BY album_id
)
SELECT row_to_json(x) FROM (
 SELECT ar.rvar, ar.canonical_name, al.id AS pg_album_id, al.title, al.release_year,
  upper(trim(aek.external_key)) AS rval, chart.b200_peak,
  al.canonical_cover_path AS cover_path,
  (SELECT aal.canonical_cover_path FROM album_artwork_links aal WHERE aal.album_id=al.id
    ORDER BY (aal.review_flag IN ('curated','ok')) DESC, aal.confidence_score DESC NULLS LAST,
    aal.updated_at DESC NULLS LAST, aal.id DESC LIMIT 1) AS artwork_path,
  (SELECT aal.r2_cover_key FROM album_artwork_links aal WHERE aal.album_id=al.id
    ORDER BY (aal.review_flag IN ('curated','ok')) DESC, aal.confidence_score DESC NULLS LAST,
    aal.updated_at DESC NULLS LAST, aal.id DESC LIMIT 1) AS r2_cover_key
 FROM albums al JOIN artists ar ON ar.id=al.artist_id
 LEFT JOIN album_external_keys aek ON aek.album_id=al.id
 LEFT JOIN chart ON chart.album_id=al.id
 ORDER BY ar.rvar, al.release_year ASC NULLS LAST, al.title ASC
) x
"""
result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query],
                        env=env, capture_output=True, check=True, timeout=300)
rows = [json.loads(line) for line in result.stdout.splitlines() if line]
if len(rows) < 21000:
    raise RuntimeError(f'album list unexpectedly small: {len(rows)}')
by_artist = {}
for row in rows:
    key = row.pop('rvar').upper()
    name = row.pop('canonical_name')
    item = by_artist.setdefault(key, {'canonicalName': name, 'albums': []})
    if len(item['albums']) < 500:
        item['albums'].append(row)
path = root / 'data/static-graph/artist-albums.json.gz'
path.write_bytes(gzip.compress(json.dumps(by_artist, separators=(',', ':'), ensure_ascii=False).encode(), compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(path.read_bytes()))) != len(by_artist):
    raise RuntimeError('artist album round-trip failed')
print(f'artist albums: {len(rows)} rows for {len(by_artist)} artists, {path.stat().st_size} compressed bytes')
