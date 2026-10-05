#!/usr/bin/env python3
"""Build the public browse snapshot from the current VirtualDJ playlists.

Only hashed media identities and display metadata are written. Local media paths
are read to join playlist entries to VirtualDJ tags, but never leave this script.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VIRTUALDJ_HOME = Path(os.environ.get("VIRTUALDJ_HOME", "/Users/bobhopp/Library/Application Support/VirtualDJ"))
PLAYLISTS = VIRTUALDJ_HOME / "MyLists"
PLAYLIST_ORDER = PLAYLISTS / "order"
DATABASE = Path(os.environ.get("VIRTUALDJ_DATABASE", str(VIRTUALDJ_HOME / "database.xml")))
OUTPUT = ROOT / "apps/live/lib/vdjbx-browse-catalog.json"
RVTR = re.compile(r"^RVTR\d{6}$", re.IGNORECASE)


def path_key(path: str) -> str:
    normalized = path.replace("\\", "/").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:24]


def playlist_files_in_display_order() -> list[tuple[str, Path]]:
    if not PLAYLIST_ORDER.is_file():
        raise SystemExit(f"VirtualDJ playlist order unavailable: {PLAYLIST_ORDER}")
    rows: list[tuple[str, Path]] = []
    for line in PLAYLIST_ORDER.read_text(encoding="utf-8").splitlines():
        name = line.strip()
        if not name.casefold().startswith("vdjbx - "):
            continue
        playlist = PLAYLISTS / f"{name}.vdjfolder"
        if not playlist.is_file():
            raise SystemExit(f"Ordered VirtualDJ playlist is missing: {name}")
        rows.append((name.removeprefix("VDJBX - "), playlist))
    if not rows:
        raise SystemExit("No ordered VDJBX playlists found in VirtualDJ's List order")
    return rows


def load_playlist_rows(ordered: list[tuple[str, Path]]) -> tuple[list[dict[str, object]], dict[str, dict[str, str]]]:
    collections: list[dict[str, object]] = []
    metadata: dict[str, dict[str, str]] = {}
    for name, playlist in ordered:
        members: list[str] = []
        for _, song in ET.iterparse(playlist, events=("end",)):
            if song.tag.lower() != "song":
                song.clear()
                continue
            path = song.get("path", "").strip()
            if not path:
                raise SystemExit(f"Playlist entry without a path in {name}")
            key = path_key(path)
            members.append(key)
            metadata.setdefault(key, {
                "playlistArtist": song.get("artist", "").strip(),
                "playlistTitle": song.get("title", "").strip(),
            })
            song.clear()
        collections.append({"displayName": name, "members": members})
    return collections, metadata


def main() -> None:
    if not DATABASE.is_file():
        raise SystemExit("Current VirtualDJ database is unavailable")
    ordered = playlist_files_in_display_order()
    collections, playlist_metadata = load_playlist_rows(ordered)
    expected = set(playlist_metadata)
    graph_ids: set[str] = set()
    import gzip

    ids_path = ROOT / "data/static-graph/canonical-track-ids.json.gz"
    graph_ids.update(json.loads(gzip.decompress(ids_path.read_bytes())).keys())

    found: dict[str, dict[str, object]] = {}
    for _, song in ET.iterparse(DATABASE, events=("end",)):
        if song.tag != "Song":
            continue
        path = song.get("FilePath", "").strip()
        key = path_key(path) if path else ""
        if key not in expected:
            song.clear()
            continue
        tags = song.find("Tags")
        fallback = playlist_metadata[key]
        artist = (tags.get("Author", "").strip() if tags is not None else "") or fallback["playlistArtist"]
        title = (tags.get("Title", "").strip() if tags is not None else "") or fallback["playlistTitle"]
        raw_year = tags.get("Year", "").strip() if tags is not None else ""
        try:
            parsed_year = int(raw_year)
        except (TypeError, ValueError):
            parsed_year = 0
        year = parsed_year if 1900 <= parsed_year <= datetime.now(timezone.utc).year else None
        label = (tags.get("Label", "").strip().upper() if tags is not None else "")
        song_rvtr = label if RVTR.fullmatch(label) and label in graph_ids else None
        hero_rvtr = song_rvtr if song_rvtr and (
            ROOT / "data/ops/intelligence/research-department" / song_rvtr / "visual-assets/hero-video.jpg"
        ).is_file() else None
        resolved_item = {
            "videoKey": key,
            "artist": artist,
            "title": title,
            "year": year,
            "collections": [],
            "songRvtr": song_rvtr,
            "heroRvtr": hero_rvtr,
        }
        previous = found.get(key)
        if previous is None or (not previous["songRvtr"] and song_rvtr):
            found[key] = resolved_item
        song.clear()

    missing = expected - set(found)
    if missing:
        raise SystemExit(f"{len(missing)} current playlist identities did not match VirtualDJ database paths")

    for collection in collections:
        for key in collection["members"]:
            item = found[key]
            names = item["collections"]
            if collection["displayName"] not in names:
                names.append(collection["displayName"])

    item_order = list(dict.fromkeys(key for collection in collections for key in collection["members"]))
    output = {
        "version": 2,
        "source": "current VirtualDJ ordered VDJBX playlists joined to database tags",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "verification": "all playlist entries matched the current VirtualDJ database by hashed media-path identity; local paths are not exported",
        "items": [found[key] for key in item_order],
        "collections": collections,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "collectionCount": len(collections),
        "membershipCount": sum(len(collection["members"]) for collection in collections),
        "uniqueMediaIdentities": len(found),
        "canonicalSongRoutes": sum(bool(item["songRvtr"]) for item in found.values()),
        "preparedHeroImages": sum(bool(item["heroRvtr"]) for item in found.values()),
        "output": str(OUTPUT.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
