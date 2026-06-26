"""Per-disc confidence scoring for archive quality."""

from __future__ import annotations

from typing import Any

GEOMETRY_TOLERANCE_DEG = 1.0


def compute_ocr_confidence(
    *,
    labeled: int,
    wedge_count: int,
    player: str,
    position: str,
    ocr_status: str,
) -> float:
    total = max(wedge_count, 1)
    wedge_ratio = min(labeled / total, 1.0)
    player_score = 1.0 if len(player.strip()) >= 3 else 0.25
    position_score = 1.0 if position.strip() else 0.4
    base = wedge_ratio * 0.55 + player_score * 0.3 + position_score * 0.15
    if ocr_status == "partial":
        base *= 0.75
    return round(max(0.0, min(100.0, base * 100)), 1)


def compute_geometry_confidence(*, degrees_sum: float) -> float:
    if degrees_sum <= 0:
        return 0.0
    error = abs(degrees_sum - 360.0)
    if error <= GEOMETRY_TOLERANCE_DEG:
        return 100.0
    if error <= 2.0:
        return 88.0
    if error <= 5.0:
        return 65.0
    if degrees_sum >= 200:
        return 40.0
    return 20.0


def compute_archive_confidence(*, ocr: float, geometry: float, validation_status: str) -> float:
    validation_score = 100.0 if validation_status == "validated" else 55.0 if validation_status == "warning" else 25.0
    score = ocr * 0.4 + geometry * 0.4 + validation_score * 0.2
    return round(max(0.0, min(100.0, score)), 1)


def trust_level(*, archive: float, ocr: float, geometry: float) -> str:
    if archive >= 85 and ocr >= 75 and geometry >= 85:
        return "trusted"
    if archive >= 55 or (ocr >= 45 and geometry >= 45):
        return "review_recommended"
    return "review_required"


def build_confidence_block(record: dict[str, Any]) -> dict[str, Any]:
    degrees = record.get("degrees") or {}
    labeled = sum(1 for v in degrees.values() if float(v or 0) > 0)
    wedge_count = int(record.get("wedgeCount") or 16)
    degrees_sum = float(record.get("degreesSum") or 0)
    ocr_status = str(record.get("ocrStatus") or "pending")
    validation_status = str(record.get("validationStatus") or "pending")

    ocr = compute_ocr_confidence(
        labeled=labeled,
        wedge_count=wedge_count,
        player=str(record.get("player") or ""),
        position=str(record.get("position") or ""),
        ocr_status=ocr_status,
    )
    geometry = compute_geometry_confidence(degrees_sum=degrees_sum)
    archive = compute_archive_confidence(ocr=ocr, geometry=geometry, validation_status=validation_status)
    trust = trust_level(archive=archive, ocr=ocr, geometry=geometry)

    return {
        "ocrConfidence": ocr,
        "geometryConfidence": geometry,
        "archiveConfidence": archive,
        "trustLevel": trust,
    }


def confidence_from_result(result, *, geometry_ok: bool, ocr_status: str, validation_status: str) -> dict[str, Any]:
    labeled = sum(1 for w in result.wedges if w.label is not None)
    wedge_count = len(result.wedges) or 16
    degrees_sum = sum(result.totals().values())
    ocr = compute_ocr_confidence(
        labeled=labeled,
        wedge_count=wedge_count,
        player=result.player,
        position=result.position,
        ocr_status=ocr_status,
    )
    geometry = compute_geometry_confidence(degrees_sum=degrees_sum)
    archive = compute_archive_confidence(ocr=ocr, geometry=geometry, validation_status=validation_status)
    trust = trust_level(archive=archive, ocr=ocr, geometry=geometry)
    return {
        "ocrConfidence": ocr,
        "geometryConfidence": geometry,
        "archiveConfidence": archive,
        "trustLevel": trust,
    }
