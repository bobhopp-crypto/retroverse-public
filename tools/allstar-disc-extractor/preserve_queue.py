#!/usr/bin/env python3
"""Queue-based batch preservation with pause/resume and per-disc auto-save."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from disc_extractor import (
    GEOMETRY_TOLERANCE_DEG,
    build_outcome_summary,
    disc_id_from_scan,
    iter_scan_paths,
    load_override,
    log_activity,
    override_path_for_scan,
    preserve_disc,
    process_scan,
    set_live_state,
    write_manifest,
)
from player_intel import write_intelligence  # noqa: F401 — used by harvest_hooks


def queue_path(output_dir: Path) -> Path:
    return output_dir / "preserve-queue.json"


def load_queue(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def save_queue(path: Path, queue: dict[str, Any]) -> None:
    queue["updatedAt"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(queue, indent=2) + "\n", encoding="utf-8")


def init_queue(scan_dir: Path, output_dir: Path) -> dict[str, Any]:
    existing = load_queue(queue_path(output_dir))
    if existing and existing.get("items"):
        return existing

    items: list[dict[str, Any]] = []
    for scan_path in iter_scan_paths(scan_dir):
        disc_id = disc_id_from_scan(scan_path)
        archive_file = output_dir / "archive" / f"{disc_id}.json"
        state = "completed" if archive_file.exists() else "pending"
        preserved_at = None
        if archive_file.exists():
            try:
                archive = json.loads(archive_file.read_text(encoding="utf-8"))
                preserved_at = archive.get("preservedAt")
            except json.JSONDecodeError:
                pass
        items.append(
            {
                "discId": disc_id,
                "scanFilename": scan_path.name,
                "state": state,
                "error": None,
                "preservedAt": preserved_at,
            }
        )

    completed = sum(1 for item in items if item["state"] == "completed")
    queue = {
        "version": 1,
        "status": "idle",
        "startedAt": None,
        "pausedAt": None,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(items),
        "counts": {
            "pending": len(items) - completed,
            "processing": 0,
            "completed": completed,
            "failed": 0,
        },
        "items": items,
    }
    save_queue(queue_path(output_dir), queue)
    return queue


def recount(queue: dict[str, Any]) -> None:
    counts = {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
    for item in queue["items"]:
        state = item.get("state", "pending")
        if state in counts:
            counts[state] += 1
    queue["counts"] = counts
    queue["total"] = len(queue["items"])


def find_item(queue: dict[str, Any], disc_id: str) -> dict[str, Any] | None:
    for item in queue["items"]:
        if item["discId"] == disc_id:
            return item
    return None


def scan_path_for_item(scan_dir: Path, item: dict[str, Any]) -> Path | None:
    target = item["scanFilename"]
    direct = scan_dir / target
    if direct.exists():
        return direct
    for path in iter_scan_paths(scan_dir):
        if path.name == target or disc_id_from_scan(path) == item["discId"]:
            return path
    return None


def read_archive_record(output_dir: Path, disc_id: str) -> dict[str, Any] | None:
    path = output_dir / "archive" / f"{disc_id}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def write_master_dataset(
    output_dir: Path,
    intel_dir: Path,
    project_root: Path | None = None,
) -> Path:
    archive_dir = output_dir / "archive"
    records: list[dict[str, Any]] = []
    if archive_dir.exists():
        for path in sorted(archive_dir.glob("*.json")):
            try:
                records.append(json.loads(path.read_text(encoding="utf-8")))
            except json.JSONDecodeError:
                continue

    intelligence: list[dict[str, Any]] = []
    if intel_dir.exists():
        for path in sorted(intel_dir.glob("*.json")):
            try:
                intelligence.append(json.loads(path.read_text(encoding="utf-8")))
            except json.JSONDecodeError:
                continue

    queue = load_queue(queue_path(output_dir)) or {}
    research_path = output_dir / "research-dataset.json"
    research_entries: list[dict[str, Any]] = []
    if research_path.exists():
        try:
            research_entries = json.loads(research_path.read_text(encoding="utf-8")).get("entries") or []
        except json.JSONDecodeError:
            pass

    avg_archive = round(
        sum(float(r.get("archiveConfidence") or 0) for r in records) / max(len(records), 1),
        1,
    )
    avg_ocr = round(
        sum(float(r.get("ocrConfidence") or 0) for r in records) / max(len(records), 1),
        1,
    )
    avg_geometry = round(
        sum(float(r.get("geometryConfidence") or 0) for r in records) / max(len(records), 1),
        1,
    )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "extractorVersion": "1.4.0",
        "totalDiscs": queue.get("total", len(records)),
        "preservedCount": len(records),
        "intelligenceCount": len(intelligence),
        "averageArchiveConfidence": avg_archive,
        "averageOcrConfidence": avg_ocr,
        "averageGeometryConfidence": avg_geometry,
        "players": records,
        "intelligence": intelligence,
        "research": research_entries,
        "queue": {
            "status": queue.get("status"),
            "counts": queue.get("counts"),
        },
    }

    out_path = output_dir / "allstar-master-dataset.json"
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if project_root:
        bundled = project_root / "data" / "ops" / "allstar" / "allstar-master-dataset.json"
        bundled.parent.mkdir(parents=True, exist_ok=True)
        bundled.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    return out_path


def run_queue(
    scan_dir: Path,
    output_dir: Path,
    *,
    intel_dir: Path,
    registry_path: Path,
    project_root: Path | None = None,
    retry_failed: bool = False,
    force: bool = False,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    qpath = queue_path(output_dir)
    queue = init_queue(scan_dir, output_dir)

    if queue.get("status") == "paused":
        queue["status"] = "running"
        queue["pausedAt"] = None

    queue["status"] = "running"
    queue["startedAt"] = queue.get("startedAt") or datetime.now(timezone.utc).isoformat()
    save_queue(qpath, queue)

    set_live_state(output_dir, running=True, current=None)
    log_activity(output_dir, "⚾ Preservation queue started")

    templates: dict = {}
    source_files: list[str] = []

    for item in queue["items"]:
        paused = load_queue(qpath)
        if paused and paused.get("status") == "paused":
            log_activity(output_dir, "⚾ Queue paused")
            set_live_state(output_dir, running=False, current=None)
            return

        state = item.get("state")
        if state == "completed" and not force and not retry_failed:
            source_files.append(item["scanFilename"])
            continue
        if state == "failed" and not retry_failed and not force:
            continue
        if state == "processing":
            item["state"] = "pending"

        scan_path = scan_path_for_item(scan_dir, item)
        if scan_path is None:
            item["state"] = "failed"
            item["error"] = "Scan file not found"
            recount(queue)
            save_queue(qpath, queue)
            continue

        if not force:
            archive = read_archive_record(output_dir, item["discId"])
            if archive and archive.get("validationStatus") == "validated":
                item["state"] = "completed"
                item["preservedAt"] = archive.get("preservedAt")
                source_files.append(item["scanFilename"])
                recount(queue)
                save_queue(qpath, queue)
                continue

        item["state"] = "processing"
        item["error"] = None
        recount(queue)
        save_queue(qpath, queue)

        override = load_override(override_path_for_scan(scan_path))
        player_hint = str(override.get("player") if override else scan_path.stem)
        set_live_state(
            output_dir,
            running=True,
            current={
                "player": player_hint,
                "position": str(override.get("position") if override else ""),
                "scanFilename": scan_path.name,
                "stage": "processing",
                "geometryStatus": "processing",
                "ocrStatus": "processing",
                "validationStatus": "processing",
                "outcomeSummary": [],
            },
        )
        log_activity(output_dir, f"⚾ Processing {player_hint}...")

        try:
            result = process_scan(scan_path, output_dir, templates=templates, override=override)
            totals = result.totals()
            geometry_ok = abs(sum(totals.values()) - 360.0) <= GEOMETRY_TOLERANCE_DEG
            set_live_state(
                output_dir,
                running=True,
                current={
                    "player": result.player or player_hint,
                    "position": result.position,
                    "scanFilename": scan_path.name,
                    "stage": "preserving",
                    "geometryStatus": "ok" if geometry_ok else "warning",
                    "ocrStatus": "complete" if sum(1 for w in result.wedges if w.label) >= 10 else "partial",
                    "validationStatus": "validated" if geometry_ok else "warning",
                    "outcomeSummary": build_outcome_summary(result),
                },
            )
            review_name = __import__("re").sub(r"[^\w.-]+", "_", scan_path.stem) + ".jpg"
            preserve_disc(result, scan_path, output_dir, review_name, override=override)

            archive_record = read_archive_record(output_dir, item["discId"])
            if archive_record:
                item["player"] = archive_record.get("player") or player_hint
                item["archiveConfidence"] = archive_record.get("archiveConfidence")
                item["trustLevel"] = archive_record.get("trustLevel")
                item["canonicalFile"] = archive_record.get("canonicalFile")

            item["state"] = "completed"
            item["preservedAt"] = datetime.now(timezone.utc).isoformat()
            item["error"] = None
            source_files.append(scan_path.name)
            log_activity(output_dir, f"⚾ Saved {result.player or scan_path.stem} to archive")
        except Exception as exc:  # noqa: BLE001
            item["state"] = "failed"
            item["error"] = str(exc)
            log_activity(output_dir, f"⚾ Failed on {scan_path.name}: {exc}")

        recount(queue)
        save_queue(qpath, queue)

    write_manifest(output_dir, source_files=list(dict.fromkeys(source_files)), phase="queue")
    recount(queue)
    queue["status"] = "idle"
    save_queue(qpath, queue)

    if queue["counts"]["completed"] >= queue["total"]:
        from harvest_hooks import generate_completion_reports

        generate_completion_reports(output_dir, intel_dir, project_root)
        log_activity(output_dir, "⚾ Full collection preserved — reports generated")

    log_activity(output_dir, f"⚾ Queue complete — {queue['counts']['completed']}/{queue['total']} preserved")
    set_live_state(output_dir, running=False, current=None)


def pause_queue(output_dir: Path) -> dict[str, Any]:
    qpath = queue_path(output_dir)
    queue = load_queue(qpath)
    if not queue:
        raise RuntimeError("No queue initialized")
    queue["status"] = "paused"
    queue["pausedAt"] = datetime.now(timezone.utc).isoformat()
    save_queue(qpath, queue)
    log_activity(output_dir, "⚾ Preservation queue paused")
    set_live_state(output_dir, running=False, current=None)
    return queue


def resume_queue(output_dir: Path) -> dict[str, Any]:
    qpath = queue_path(output_dir)
    queue = load_queue(qpath)
    if not queue:
        raise RuntimeError("No queue initialized")
    queue["status"] = "running"
    queue["pausedAt"] = None
    save_queue(qpath, queue)
    return queue
