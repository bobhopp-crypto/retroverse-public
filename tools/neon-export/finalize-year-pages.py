#!/usr/bin/env python3
"""Validate and compress the exact public year chronology snapshots."""
import gzip
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
folder = root / 'data/static-graph/years'
sources = sorted(folder.glob('[0-9][0-9][0-9][0-9].json'))
if len(sources) < 68:
    raise SystemExit(f'year export incomplete: {len(sources)} files')
manifest = {}
for source in sources:
    raw = source.read_bytes()
    item = json.loads(raw)
    year = int(source.stem)
    if item.get('year') != year or not item.get('history') or not item.get('destination'):
        raise SystemExit(f'invalid year page {year}')
    if not item['history'].get('entries'):
        raise SystemExit(f'empty year history {year}')
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    target = source.with_suffix('.json.gz')
    target.write_bytes(compressed)
    if gzip.decompress(target.read_bytes()) != raw:
        raise SystemExit(f'year page round-trip failed {year}')
    manifest[str(year)] = {'bytes': len(compressed), 'sha256': hashlib.sha256(compressed).hexdigest()}
(folder / 'manifest.json').write_text(json.dumps({'version': 1, 'years': manifest}, separators=(',', ':'))+'\n')
for source in sources:
    source.unlink()
print(f'finalized {len(sources)} year pages')
