"""Position-first canonical scan filenames for the preserved collection."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

POSITION_ABBREV: tuple[tuple[str, str], ...] = (
    ("PITCHER", "P"),
    ("CATCHER", "C"),
    ("FIRST BASE", "1B"),
    ("SECOND BASE", "2B"),
    ("THIRD BASE", "3B"),
    ("SHORTSTOP", "SS"),
    ("LEFT FIELD", "LF"),
    ("CENTER FIELD", "CF"),
    ("RIGHT FIELD", "RF"),
    ("OUTFIELD", "OF"),
    ("INFIELD", "IF"),
    ("MANAGER", "MGR"),
)


def position_abbrev(position: str) -> str:
    upper = position.upper().strip()
    if not upper:
        return "UNK"
    for key, abbrev in POSITION_ABBREV:
        if key in upper:
            return abbrev
    if "FIELD" in upper:
        return "OF"
    token = re.sub(r"[^A-Z0-9]", "", upper)
    return token[:3] if token else "UNK"


def sanitize_player_name(player: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]', "", player.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned and cleaned == cleaned.upper():
        cleaned = cleaned.title()
    return cleaned or "Unknown"


def normalize_player_key(player: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", player.upper())


def existing_player_names(output_dir: Path, *, exclude_disc_id: str | None = None) -> set[str]:
    names: set[str] = set()
    archive_dir = output_dir / "archive"
    if not archive_dir.exists():
        return names
    for path in archive_dir.glob("*.json"):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        disc_id = str(record.get("id") or path.stem)
        if exclude_disc_id and disc_id == exclude_disc_id:
            continue
        player = str(record.get("player") or "").strip()
        if player:
            names.add(normalize_player_key(player))
    return names


def build_canonical_filename(
    *,
    player: str,
    position: str,
    disc_id: str,
    output_dir: Path,
) -> str:
    abbrev = position_abbrev(position)
    safe_player = sanitize_player_name(player)
    base = f"{abbrev}-{safe_player}.jpg"
    player_key = normalize_player_key(player)
    if player_key and player_key in existing_player_names(output_dir, exclude_disc_id=disc_id):
        return f"{abbrev}-{safe_player}-{disc_id}.jpg"
    return base


def canonical_scans_dir(project_root: Path) -> Path:
    return project_root / "data" / "ops" / "allstar" / "canonical-scans"


def copy_canonical_scan(
    scan_path: Path,
    *,
    player: str,
    position: str,
    disc_id: str,
    output_dir: Path,
    project_root: Path,
) -> str:
    """Copy scan to canonical-scans; never modify the original."""
    dest_dir = canonical_scans_dir(project_root)
    dest_dir.mkdir(parents=True, exist_ok=True)

    filename = build_canonical_filename(
        player=player,
        position=position,
        disc_id=disc_id,
        output_dir=output_dir,
    )
    dest_path = dest_dir / filename

    if dest_path.exists():
        try:
            existing_id = None
            archive_dir = output_dir / "archive"
            if archive_dir.exists():
                for path in archive_dir.glob("*.json"):
                    try:
                        record = json.loads(path.read_text(encoding="utf-8"))
                    except json.JSONDecodeError:
                        continue
                    if record.get("canonicalFile") == filename:
                        existing_id = str(record.get("id") or "")
                        break
            if existing_id and existing_id != disc_id:
                filename = f"{position_abbrev(position)}-{sanitize_player_name(player)}-{disc_id}.jpg"
                dest_path = dest_dir / filename
        except OSError:
            filename = f"{position_abbrev(position)}-{sanitize_player_name(player)}-{disc_id}.jpg"
            dest_path = dest_dir / filename

    shutil.copy2(scan_path, dest_path)
    return filename
