#!/usr/bin/env python3
"""Export only still-present VDJBX browse entries, without storing local paths."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/ops/vdjbx-source-catalog.json"
DATABASE = Path(os.environ.get("VIRTUALDJ_DATABASE", "/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml"))
OUTPUT = ROOT / "apps/live/lib/vdjbx-browse-catalog.json"
VIDEO_ROOT = "/USERS/BOBHOPP/DJ MEDIA/VIDEO/"
RVTR = re.compile(r"^RVTR\d{6}$", re.IGNORECASE)


def main() -> None:
    if not DATABASE.is_file():
        raise SystemExit(f"VirtualDJ database unavailable: {DATABASE}")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    by_key = {str(video["videoKey"]).lower(): video for video in source.get("videos", [])}
    memberships: dict[str, list[str]] = {key: [] for key in by_key}
    for collection in source.get("collections", []):
        name = str(collection.get("displayName", "")).strip()
        for key in collection.get("members", []):
            normalized = str(key).lower()
            if normalized in memberships and name not in memberships[normalized]:
                memberships[normalized].append(name)

    static_track_ids: set[str] = set()
    for shard in (ROOT / "data/static-graph/tracks").glob("*.json.gz"):
        import gzip

        static_track_ids.update(json.loads(gzip.decompress(shard.read_bytes())).keys())

    verified: dict[str, dict[str, object]] = {}
    for _, song in ET.iterparse(DATABASE, events=("end",)):
        if song.tag != "Song":
            continue
        source_path = song.get("FilePath", "").replace("\\", "/")
        if not source_path.upper().startswith(VIDEO_ROOT):
            song.clear()
            continue
        key = hashlib.sha256(source_path.encode("utf-8")).hexdigest()[:24]
        if key not in by_key or not Path(source_path).is_file():
            song.clear()
            continue

        tags = song.find("Tags")
        artist = (tags.get("Author", "").strip() if tags is not None else "") or str(by_key[key].get("artist", "")).strip()
        title = (tags.get("Title", "").strip() if tags is not None else "") or str(by_key[key].get("title", "")).strip()
        raw_year = tags.get("Year", "") if tags is not None else ""
        try:
            year_value = int(raw_year)
        except (TypeError, ValueError):
            year_value = 0
        year = year_value if 1900 <= year_value <= datetime.now(timezone.utc).year else None

        label = (tags.get("Label", "").strip().upper() if tags is not None else "")
        song_rvtr = label if RVTR.fullmatch(label) and label in static_track_ids else None
        hero_rvtr = song_rvtr if song_rvtr and (
            ROOT / "data/ops/intelligence/research-department" / song_rvtr / "visual-assets/hero-video.jpg"
        ).is_file() else None

        verified[key] = {
            "videoKey": key,
            "artist": artist,
            "title": title,
            "year": year,
            "collections": memberships[key],
            "songRvtr": song_rvtr,
            "heroRvtr": hero_rvtr,
        }
        song.clear()

    items = [verified[key] for key in by_key if key in verified]
    included_keys = {str(item["videoKey"]) for item in items}
    collections = [
        {
            "displayName": str(collection.get("displayName", "")).strip(),
            "members": [str(key).lower() for key in collection.get("members", []) if str(key).lower() in included_keys],
        }
        for collection in source.get("collections", [])
    ]
    collections = [collection for collection in collections if collection["displayName"] and collection["members"]]

    output = {
        "version": 1,
        "sourceCatalogGeneratedAt": source.get("generatedAt"),
        "mediaVerifiedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "verification": "videoKey matched a path in the current VirtualDJ database and that local video file existed",
        "items": items,
        "collections": collections,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "sourceItems": len(by_key),
        "verifiedCurrentMedia": len(items),
        "omittedUnavailable": len(by_key) - len(items),
        "collections": len(collections),
        "canonicalSongRoutes": sum(bool(item["songRvtr"]) for item in items),
        "verifiedHeroImages": sum(bool(item["heroRvtr"]) for item in items),
        "output": str(OUTPUT.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
