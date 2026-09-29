#!/usr/bin/env python3
"""Validate and compress all exported Billboard Hot 100 week contexts."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / 'data/static-graph/weeks'
sources = sorted(folder.glob('[0-9][0-9][0-9][0-9].json'))
if len(sources) < 68:
    raise SystemExit(f'week export incomplete: {len(sources)} year files')
manifest = {}
total = 0
for source in sources:
    raw = source.read_bytes()
    weeks = json.loads(raw)
    if not weeks:
        raise SystemExit(f'empty week year {source.stem}')
    for date, context in weeks.items():
        if date[:4] != source.stem or context.get('chartDate') != date:
            raise SystemExit(f'invalid week date {date}')
        if not context.get('rows'):
            raise SystemExit(f'empty week {date}')
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    target = source.with_suffix('.json.gz')
    target.write_bytes(compressed)
    if gzip.decompress(target.read_bytes()) != raw:
        raise SystemExit(f'week round-trip failed {source.stem}')
    manifest[source.stem] = {'weeks': len(weeks), 'bytes': len(compressed),
                             'sha256': hashlib.sha256(compressed).hexdigest()}
    total += len(weeks)
if total != 3517:
    raise SystemExit(f'expected 3517 weeks, found {total}')
(folder / 'manifest.json').write_text(json.dumps({'version': 1, 'weeks': total, 'years': manifest}, separators=(',', ':'))+'\n')
for source in sources:
    source.unlink()
print(f'finalized {total} weeks in {len(sources)} year shards')
