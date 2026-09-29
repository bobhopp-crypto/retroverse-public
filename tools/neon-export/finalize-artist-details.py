#!/usr/bin/env python3
"""Validate and compress full chart and related-artist snapshots."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
base = root / 'data/static-graph'
expected = {row['rvar'] for row in json.loads(gzip.decompress((base / 'artist-identities.json.gz').read_bytes()))}
folder = base / 'artist-details'
if list(folder.glob('*.errors.json')):
    raise SystemExit('artist detail export has unresolved errors')
sources = sorted(folder.glob('[0-9][0-9][0-9][0-9].json'))
if not sources:
    raise SystemExit('artist detail export missing')
seen = set()
manifest = {}
for source in sources:
    raw = source.read_bytes()
    records = json.loads(raw)
    for rvar, detail in records.items():
        if rvar in seen or rvar not in expected or not isinstance(detail.get('relatedArtists'), list):
            raise SystemExit(f'invalid artist detail {rvar}')
        seen.add(rvar)
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    target = source.with_suffix('.json.gz')
    target.write_bytes(compressed)
    if gzip.decompress(target.read_bytes()) != raw:
        raise SystemExit(f'detail round-trip failed {source.stem}')
    manifest[source.stem] = {'count': len(records), 'bytes': len(compressed),
                             'sha256': hashlib.sha256(compressed).hexdigest()}
if seen != expected:
    raise SystemExit(f'detail export incomplete: {len(seen)}/{len(expected)}')
(folder / 'manifest.json').write_text(json.dumps({'version': 1, 'total': len(seen), 'shards': manifest}, separators=(',', ':'))+'\n')
for source in sources:
    source.unlink()
print(f'finalized {len(seen)} artist detail records')
