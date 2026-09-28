#!/usr/bin/env python3
"""Compress and validate exact track-page exports for the live runtime."""
import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / "data/static-graph/tracks"
shards = {}
for prefix in (f"{n:02d}" for n in range(100)):
    source = folder / f"{prefix}.json"
    if not source.is_file():
        raise SystemExit(f"missing shard {prefix}")
    if (folder / f"{prefix}.errors.json").exists():
        raise SystemExit(f"unresolved export errors for shard {prefix}")
    raw = source.read_bytes()
    rows = json.loads(raw)
    if not isinstance(rows, dict):
        raise SystemExit(f"invalid shard {prefix}")
    for rvtr, record in rows.items():
        if not rvtr.startswith(f"RVTR{prefix}") or record.get("rvtr") != rvtr:
            raise SystemExit(f"invalid track identity in shard {prefix}")
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    target = folder / f"{prefix}.json.gz"
    target.write_bytes(compressed)
    if gzip.decompress(target.read_bytes()) != raw:
        raise SystemExit(f"round-trip failed for shard {prefix}")
    shards[prefix] = {
        "count": len(rows),
        "bytes": len(compressed),
        "sha256": hashlib.sha256(compressed).hexdigest(),
    }
manifest = {
    "version": 1,
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "totalTracks": sum(item["count"] for item in shards.values()),
    "shards": shards,
}
if manifest["totalTracks"] < 40_000:
    raise SystemExit("track export unexpectedly small")
(folder / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
for prefix in shards:
    (folder / f"{prefix}.json").unlink()
print(f"finalized {manifest['totalTracks']} tracks in 100 verified gzip shards")
