"""Post-preserve hooks: research dataset, master dataset, enrichment logs, reports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

OUTCOME_KEYS = (
    ("homeRun", ("1",)),
    ("triple", ("5",)),
    ("double", ("11",)),
    ("walk", ("9",)),
    ("strikeout", ("10",)),
    ("singles", ("7", "13")),
    ("outs", ("2", "3", "4", "6", "8", "12", "14")),
)


def research_entry_from_archive(archive: dict[str, Any]) -> dict[str, Any]:
    probs = {str(k): float(v) for k, v in (archive.get("probabilities") or {}).items()}
    probabilities = {}
    for key, numbers in OUTCOME_KEYS:
        probabilities[key] = round(sum(probs.get(n, 0.0) for n in numbers), 4)
    return {
        "discId": archive.get("id"),
        "player": archive.get("player"),
        "position": archive.get("position"),
        "probabilities": probabilities,
        "confidence": {
            "ocr": archive.get("ocrConfidence"),
            "geometry": archive.get("geometryConfidence"),
            "archive": archive.get("archiveConfidence"),
            "trustLevel": archive.get("trustLevel"),
        },
        "preservedAt": archive.get("preservedAt"),
    }


def append_research_dataset(output_dir: Path, archive: dict[str, Any], project_root: Path | None = None) -> None:
    path = output_dir / "research-dataset.json"
    entry = research_entry_from_archive(archive)
    disc_id = str(entry.get("discId") or "")

    payload: dict[str, Any]
    if path.exists():
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = {"entries": []}
    else:
        payload = {"entries": []}

    entries: list[dict[str, Any]] = payload.get("entries") or []
    entries = [e for e in entries if e.get("discId") != disc_id]
    entries.append(entry)
    entries.sort(key=lambda e: str(e.get("discId") or ""))

    payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["entryCount"] = len(entries)
    payload["entries"] = entries
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if project_root:
        bundled_research = project_root / "data" / "ops" / "allstar" / "research-dataset.json"
        bundled_research.parent.mkdir(parents=True, exist_ok=True)
        bundled_research.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def log_enrichment_failure(output_dir: Path, disc_id: str, player: str, reason: str) -> None:
    path = output_dir / "enrichment-failures.jsonl"
    payload = {
        "discId": disc_id,
        "player": player,
        "reason": reason,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")


def maybe_expand_registry(
    registry_path: Path,
    intel_record: dict[str, Any],
    output_dir: Path,
) -> None:
    """Append high-confidence registry entries for future fuzzy matching."""
    if intel_record.get("statsSource") not in ("registry", "registry-fuzzy"):
        log_enrichment_failure(
            output_dir,
            str(intel_record.get("discId") or ""),
            str(intel_record.get("fullName") or ""),
            f"Registry miss — statsSource={intel_record.get('statsSource')}",
        )
        return

    if not registry_path.exists():
        return

    try:
        raw = json.loads(registry_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    players = raw.setdefault("players", {})
    from player_intel import normalize_name

    key = normalize_name(str(intel_record.get("fullName") or ""))
    if key and key not in players:
        players[key] = {
            "fullName": intel_record.get("fullName"),
            "position": intel_record.get("position"),
            "hallOfFame": intel_record.get("hallOfFame"),
            "hofYear": intel_record.get("hofYear"),
            "debutYear": intel_record.get("debutYear"),
            "finalYear": intel_record.get("finalYear"),
            "primaryTeams": intel_record.get("primaryTeams"),
            "era": intel_record.get("era"),
            "career": intel_record.get("career"),
            "notes": intel_record.get("notes"),
            "source": "auto-expanded",
        }
        registry_path.write_text(json.dumps(raw, indent=2) + "\n", encoding="utf-8")


def generate_completion_reports(
    output_dir: Path,
    intel_dir: Path,
    project_root: Path | None,
) -> None:
    reports_dir = output_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    archive_dir = output_dir / "archive"
    archives: list[dict[str, Any]] = []
    for path in sorted(archive_dir.glob("*.json")):
        try:
            archives.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue

    intelligence: list[dict[str, Any]] = []
    if intel_dir.exists():
        for path in sorted(intel_dir.glob("*.json")):
            try:
                intelligence.append(json.loads(path.read_text(encoding="utf-8")))
            except json.JSONDecodeError:
                continue

    total = len(archives)
    hof = [a for a in archives if a.get("hallOfFame")]
    trusted = [a for a in archives if a.get("trustLevel") == "trusted"]
    review_required = [a for a in archives if a.get("trustLevel") == "review_required"]

    avg_archive = round(
        sum(float(a.get("archiveConfidence") or 0) for a in archives) / max(len(archives), 1),
        1,
    )

    preservation = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalPreserved": total,
        "trustedCount": len(trusted),
        "reviewRequiredCount": len(review_required),
        "averageArchiveConfidence": avg_archive,
        "failedCount": 0,
    }
    (reports_dir / "preservation-report.json").write_text(
        json.dumps(preservation, indent=2) + "\n",
        encoding="utf-8",
    )

    hof_report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "hofPreserved": len(hof),
        "hofPlayers": [{"discId": a.get("id"), "player": a.get("player")} for a in hof],
    }
    (reports_dir / "hall-of-fame-report.json").write_text(
        json.dumps(hof_report, indent=2) + "\n",
        encoding="utf-8",
    )

    ranked = sorted(
        intelligence,
        key=lambda r: int(r.get("accuracyScore") or 0),
        reverse=True,
    )
    accuracy = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sampleSize": len(intelligence),
        "averageAccuracy": round(
            sum(int(r.get("accuracyScore") or 0) for r in intelligence) / max(len(intelligence), 1),
            1,
        ),
        "mostAccurate": ranked[:10],
        "leastAccurate": ranked[-10:][::-1] if ranked else [],
    }
    (reports_dir / "accuracy-report.json").write_text(
        json.dumps(accuracy, indent=2) + "\n",
        encoding="utf-8",
    )

    research_path = output_dir / "research-dataset.json"
    research_entries: list[dict[str, Any]] = []
    if research_path.exists():
        try:
            research_entries = json.loads(research_path.read_text(encoding="utf-8")).get("entries") or []
        except json.JSONDecodeError:
            pass

    formula = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "researchEntryCount": len(research_entries),
        "note": "Cadaco formula reverse-engineering starter — correlate disc probabilities with MLB career rates.",
        "sampleEntries": research_entries[:5],
    }
    (reports_dir / "cadaco-formula-starter-report.json").write_text(
        json.dumps(formula, indent=2) + "\n",
        encoding="utf-8",
    )

    if project_root:
        bundled_reports = project_root / "data" / "ops" / "allstar" / "reports"
        bundled_reports.mkdir(parents=True, exist_ok=True)
        for name in (
            "preservation-report.json",
            "hall-of-fame-report.json",
            "accuracy-report.json",
            "cadaco-formula-starter-report.json",
        ):
            src = reports_dir / name
            if src.exists():
                (bundled_reports / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


def post_preserve(
    output_dir: Path,
    intel_dir: Path,
    registry_path: Path,
    project_root: Path | None,
    archive: dict[str, Any],
) -> None:
    from player_intel import write_intelligence
    from preserve_queue import write_master_dataset

    disc_id = str(archive.get("id") or "")
    append_research_dataset(output_dir, archive, project_root)

    intel_path = write_intelligence(archive, intel_dir, registry_path)
    try:
        intel_record = json.loads(intel_path.read_text(encoding="utf-8"))
        maybe_expand_registry(registry_path, intel_record, output_dir)
    except json.JSONDecodeError:
        pass

    write_master_dataset(output_dir, intel_dir, project_root)

    queue_path = output_dir / "preserve-queue.json"
    if queue_path.exists():
        try:
            queue = json.loads(queue_path.read_text(encoding="utf-8"))
            if queue.get("counts", {}).get("completed", 0) >= queue.get("total", 0):
                generate_completion_reports(output_dir, intel_dir, project_root)
        except json.JSONDecodeError:
            pass
