"""Auto-generate player intelligence records after disc preservation."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

POSITION_AVERAGES: dict[str, dict[str, float | int]] = {
    "PITCHER": {"pa": 800, "ab": 750, "hits": 120, "hr": 8, "doubles": 20, "triples": 3, "bb": 40, "so": 180, "war": 15.0, "games": 350},
    "CATCHER": {"pa": 4500, "ab": 4000, "hits": 1050, "hr": 120, "doubles": 180, "triples": 15, "bb": 400, "so": 650, "war": 25.0, "games": 1400},
    "FIRST BASE": {"pa": 5500, "ab": 4800, "hits": 1400, "hr": 250, "doubles": 280, "triples": 20, "bb": 600, "so": 900, "war": 35.0, "games": 1600},
    "SECOND BASE": {"pa": 5200, "ab": 4700, "hits": 1300, "hr": 80, "doubles": 240, "triples": 40, "bb": 450, "so": 700, "war": 30.0, "games": 1500},
    "THIRD BASE": {"pa": 5400, "ab": 4800, "hits": 1350, "hr": 200, "doubles": 260, "triples": 25, "bb": 520, "so": 850, "war": 32.0, "games": 1550},
    "SHORTSTOP": {"pa": 5100, "ab": 4600, "hits": 1250, "hr": 70, "doubles": 220, "triples": 35, "bb": 420, "so": 750, "war": 28.0, "games": 1450},
    "LEFT FIELD": {"pa": 5600, "ab": 5000, "hits": 1450, "hr": 220, "doubles": 270, "triples": 40, "bb": 550, "so": 950, "war": 38.0, "games": 1650},
    "CENTER FIELD": {"pa": 5500, "ab": 4900, "hits": 1400, "hr": 180, "doubles": 260, "triples": 50, "bb": 520, "so": 900, "war": 40.0, "games": 1600},
    "RIGHT FIELD": {"pa": 5400, "ab": 4800, "hits": 1350, "hr": 200, "doubles": 250, "triples": 30, "bb": 500, "so": 880, "war": 35.0, "games": 1550},
    "OUTFIELD": {"pa": 5500, "ab": 4900, "hits": 1400, "hr": 200, "doubles": 260, "triples": 45, "bb": 520, "so": 900, "war": 38.0, "games": 1600},
    "DEFAULT": {"pa": 5000, "ab": 4500, "hits": 1250, "hr": 150, "doubles": 230, "triples": 30, "bb": 450, "so": 800, "war": 30.0, "games": 1500},
}

ERA_RANGES = (
    ("deadBall", 1901, 1919),
    ("babeRuth", 1920, 1941),
    ("postWar", 1946, 1960),
    ("expansion", 1961, 1976),
    ("modern", 1977, 9999),
)


def normalize_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9 ]", "", name.upper())
    return re.sub(r"\s+", " ", cleaned).strip()


def position_bucket(position: str) -> str:
    upper = position.upper()
    for key in POSITION_AVERAGES:
        if key == "DEFAULT":
            continue
        if key in upper:
            return key
    if "FIELD" in upper:
        return "OUTFIELD"
    return "DEFAULT"


def era_from_years(debut: int, final: int) -> str:
    midpoint = round((debut + final) / 2)
    for key, start, end in ERA_RANGES:
        if start <= midpoint <= end:
            return key
    return "modern"


def disc_rates(probabilities: dict[str, float]) -> dict[str, float]:
    return {
        "hr": probabilities.get("1", 0.0),
        "bb": probabilities.get("9", 0.0),
        "k": probabilities.get("10", 0.0),
        "double": probabilities.get("11", 0.0),
        "triple": probabilities.get("5", 0.0),
    }


def career_rates(career: dict[str, float | int]) -> dict[str, float]:
    pa = max(int(career.get("pa", 1)), 1)
    return {
        "hr": float(career.get("hr", 0)) / pa,
        "bb": float(career.get("bb", 0)) / pa,
        "k": float(career.get("so", 0)) / pa,
        "double": float(career.get("doubles", 0)) / pa,
        "triple": float(career.get("triples", 0)) / pa,
    }


def accuracy_score(probabilities: dict[str, float], career: dict[str, float | int]) -> tuple[int, str]:
    disc = disc_rates(probabilities)
    actual = career_rates(career)
    deltas = [abs(disc[k] - actual[k]) for k in disc]
    mean_abs = sum(deltas) / max(len(deltas), 1)
    score = round(max(0, min(100, 100 - mean_abs * 400)))
    label = (
        "Excellent match"
        if score >= 85
        else "Strong match"
        if score >= 70
        else "Fair match"
        if score >= 55
        else "Loose match"
    )
    return score, label


def load_registry(registry_path: Path) -> dict[str, dict[str, Any]]:
    if not registry_path.exists():
        return {}
    try:
        raw = json.loads(registry_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    players = raw.get("players") if isinstance(raw, dict) else raw
    if not isinstance(players, dict):
        return {}
    return {normalize_name(k): v for k, v in players.items()}


def lookup_player(name: str, registry: dict[str, dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    key = normalize_name(name)
    if key in registry:
        return registry[key], "registry"
    for reg_key, entry in registry.items():
        if key in reg_key or reg_key in key:
            return entry, "registry-fuzzy"
    return None, "estimated"


def build_career_from_position(position: str) -> dict[str, float | int]:
    bucket = position_bucket(position)
    avg = POSITION_AVERAGES.get(bucket, POSITION_AVERAGES["DEFAULT"])
    return {
        "games": int(avg["games"]),
        "pa": int(avg["pa"]),
        "ab": int(avg["ab"]),
        "hits": int(avg["hits"]),
        "hr": int(avg["hr"]),
        "doubles": int(avg["doubles"]),
        "triples": int(avg["triples"]),
        "bb": int(avg["bb"]),
        "so": int(avg["so"]),
        "war": float(avg["war"]),
    }


def generate_intelligence_record(
    archive_record: dict[str, Any],
    registry_path: Path,
) -> dict[str, Any]:
    registry = load_registry(registry_path)
    player = str(archive_record.get("player") or "").strip()
    position = str(archive_record.get("position") or "").strip()
    disc_id = str(archive_record.get("id") or "")
    hall = bool(archive_record.get("hallOfFame"))
    hof_year = archive_record.get("hofYear")

    matched, stats_source = lookup_player(player, registry)
    if matched:
        full_name = str(matched.get("fullName") or player)
        position = str(matched.get("position") or position)
        hall = bool(matched.get("hallOfFame", hall))
        hof_year = matched.get("hofYear", hof_year)
        debut = int(matched.get("debutYear") or 1950)
        final = int(matched.get("finalYear") or debut + 15)
        teams = list(matched.get("primaryTeams") or [])
        career = dict(matched.get("career") or {})
        notes = matched.get("notes")
        era = str(matched.get("era") or era_from_years(debut, final))
    else:
        full_name = player or disc_id
        debut = 1950
        final = 1965
        teams = []
        career = build_career_from_position(position)
        notes = "Estimated career profile — registry match pending."
        era = era_from_years(debut, final)
        stats_source = "estimated"

    probabilities = {str(k): float(v) for k, v in (archive_record.get("probabilities") or {}).items()}
    score, label = accuracy_score(probabilities, career)

    research_probs: dict[str, float] = {}
    for key, numbers in (
        ("homeRun", ("1",)),
        ("triple", ("5",)),
        ("double", ("11",)),
        ("walk", ("9",)),
        ("strikeout", ("10",)),
        ("singles", ("7", "13")),
        ("outs", ("2", "3", "4", "6", "8", "12", "14")),
    ):
        research_probs[key] = round(sum(probabilities.get(n, 0.0) for n in numbers), 4)

    enrichment_status = "enriched" if stats_source in ("registry", "registry-fuzzy") else "pending"
    enrichment_failures: list[str] = []
    if enrichment_status == "pending":
        enrichment_failures.append("Registry match not found — using position averages")

    return {
        "discId": disc_id,
        "fullName": full_name,
        "position": position or "Unknown",
        "hallOfFame": hall,
        "hofYear": hof_year if isinstance(hof_year, int) else None,
        "debutYear": debut,
        "finalYear": final,
        "primaryTeams": teams,
        "era": era,
        "career": career,
        "notes": notes,
        "statsSource": stats_source,
        "accuracyScore": score,
        "accuracyLabel": label,
        "researchProbabilities": research_probs,
        "enrichmentStatus": enrichment_status,
        "enrichmentFailures": enrichment_failures,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def write_intelligence(
    archive_record: dict[str, Any],
    intel_dir: Path,
    registry_path: Path,
) -> Path:
    intel_dir.mkdir(parents=True, exist_ok=True)
    record = generate_intelligence_record(archive_record, registry_path)
    out_path = intel_dir / f"{record['discId']}.json"
    out_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out_path
