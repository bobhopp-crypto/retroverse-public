#!/usr/bin/env python3
"""Validate and compress faithful artist/album page snapshots."""
import gzip
import hashlib
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
base = root / 'data/static-graph'
for kind, index_name, identity_field, minimum in (
    ('artists', 'artist-identities', 'rvar', 8900),
    ('albums', 'album-identities', 'rval', 21000),
):
    if '--only' in sys.argv and sys.argv[sys.argv.index('--only') + 1] != kind:
        continue
    expected_rows = json.loads(gzip.decompress((base / f'{index_name}.json.gz').read_bytes()))
    expected = {row[identity_field] for row in expected_rows}
    folder = base / kind
    errors = list(folder.glob('*.errors.json'))
    if errors:
        raise SystemExit(f'{kind}: {len(errors)} unresolved export error files')
    source_files = sorted(folder.glob('[0-9]*.json'))
    if not source_files:
        raise SystemExit(f'{kind}: no export shards')
    seen = set()
    manifest = {}
    for source in source_files:
        rows = json.loads(source.read_bytes())
        if not isinstance(rows, dict):
            raise SystemExit(f'{source}: expected object')
        for identity, record in rows.items():
            if identity in seen or identity not in expected:
                raise SystemExit(f'{source}: duplicate or unknown identity {identity}')
            if not isinstance(record, dict):
                raise SystemExit(f'{source}: invalid page record')
            if kind == 'artists' and (record.get('page') or {}).get('artistId', 0) <= 0:
                raise SystemExit(f'{source}: unresolved artist {identity}')
            if kind == 'albums' and record.get('rval') != identity:
                raise SystemExit(f'{source}: wrong album identity {identity}')
            seen.add(identity)
        raw = source.read_bytes()
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        target = source.with_suffix('.json.gz')
        target.write_bytes(compressed)
        if gzip.decompress(target.read_bytes()) != raw:
            raise SystemExit(f'{target}: round-trip failed')
        manifest[source.stem] = {'count': len(rows), 'bytes': len(compressed), 'sha256': hashlib.sha256(compressed).hexdigest()}
    if len(seen) < minimum or seen != expected:
        missing = len(expected - seen)
        raise SystemExit(f'{kind}: incomplete export, {len(seen)}/{len(expected)}, missing {missing}')
    (folder / 'manifest.json').write_text(json.dumps({'version': 1, 'total': len(seen), 'shards': manifest}, separators=(',', ':')) + '\n')
    for source in source_files:
        source.unlink()
    print(f'{kind}: finalized {len(seen)} pages in {len(source_files)} shards')
