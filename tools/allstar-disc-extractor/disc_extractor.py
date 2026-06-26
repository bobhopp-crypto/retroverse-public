#!/usr/bin/env python3
"""Cadaco All-Star Baseball disc extractor."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import pytesseract

from confidence import confidence_from_result
from canonical_scans import copy_canonical_scan

N_ANGLES = 3600
DEG_PER_PX = 360.0 / N_ANGLES
RESULT_COLUMNS = [str(i) for i in range(1, 15)]
GEOMETRY_TOLERANCE_DEG = 1.0
CSV_FIELDNAMES = ["source_file", "player", "position", *RESULT_COLUMNS]
POSITIONS = (
    "PITCHER",
    "CATCHER",
    "FIRST BASE",
    "SECOND BASE",
    "THIRD BASE",
    "SHORTSTOP",
    "LEFT FIELD",
    "CENTER FIELD",
    "RIGHT FIELD",
    "OUTFIELD",
    "INFIELD",
    "MANAGER",
)


@dataclass
class Wedge:
    index: int
    start_deg: float
    end_deg: float
    label: int | None = None

    @property
    def span_deg(self) -> float:
        return (self.end_deg - self.start_deg) % 360.0

    @property
    def mid_deg(self) -> float:
        return (self.start_deg + self.span_deg / 2.0) % 360.0


@dataclass
class DiscResult:
    source: str
    player: str = ""
    position: str = ""
    wedges: list[Wedge] = field(default_factory=list)
    center: tuple[int, int] = (0, 0)
    radius: int = 0
    r_inner: float = 0.0
    r_outer: float = 0.0
    warnings: list[str] = field(default_factory=list)

    def totals(self) -> dict[int, float]:
        totals = {i: 0.0 for i in range(1, 15)}
        for wedge in self.wedges:
            if wedge.label is not None:
                totals[wedge.label] += wedge.span_deg
        return totals

    def probabilities(self) -> dict[int, float]:
        return {k: v / 360.0 for k, v in self.totals().items()}


def detect_disc(gray: np.ndarray) -> tuple[int, int, int]:
    h, w = gray.shape
    blur = cv2.GaussianBlur(gray, (9, 9), 2)
    circles = cv2.HoughCircles(
        blur,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=min(h, w) // 2,
        param1=80,
        param2=40,
        minRadius=int(min(h, w) * 0.35),
        maxRadius=int(min(h, w) * 0.49),
    )
    if circles is None:
        raise RuntimeError("Could not detect outer disc circle")
    cx, cy, radius = max(circles[0], key=lambda item: item[2])
    return int(cx), int(cy), int(radius)


def polar_unwrap(
    gray: np.ndarray, cx: int, cy: int, r_inner: float, r_outer: float
) -> np.ndarray:
    radii = np.linspace(r_inner, r_outer, max(20, int(r_outer - r_inner)))
    angles = np.linspace(0, 2 * np.pi, N_ANGLES, endpoint=False)
    xs = (cx + radii[:, None] * np.cos(angles[None, :])).astype(np.int32)
    ys = (cy + radii[:, None] * np.sin(angles[None, :])).astype(np.int32)
    xs = np.clip(xs, 0, gray.shape[1] - 1)
    ys = np.clip(ys, 0, gray.shape[0] - 1)
    return gray[ys, xs]


def column_energy(polar: np.ndarray) -> np.ndarray:
    sx = cv2.Sobel(cv2.GaussianBlur(polar, (3, 3), 0), cv2.CV_64F, 1, 0, ksize=3)
    col = np.mean(np.abs(sx), axis=0)
    return cv2.GaussianBlur(col.reshape(1, -1), (1, 21), 0).flatten()


def candidate_peaks(col: np.ndarray, min_prom: float = 10.0) -> list[tuple[float, int]]:
    peaks: list[tuple[float, int]] = []
    for idx in range(5, len(col) - 5):
        if col[idx] <= col[idx - 1] or col[idx] < col[idx + 1]:
            continue
        window = 25
        left = min(col[max(0, idx - window) : idx])
        right = min(col[idx + 1 : min(len(col), idx + window + 1)])
        prom = col[idx] - max(left, right)
        if prom >= min_prom:
            peaks.append((float(col[idx]), idx))
    peaks.sort(reverse=True)
    return peaks


def choose_wedge_count(col: np.ndarray, min_count: int = 14, max_count: int = 18) -> int:
    """Pick divider count whose wedge spans best cover 360°."""
    best_count = 16
    best_score = float("inf")
    for target in range(min_count, max_count + 1):
        try:
            dividers = select_dividers(col, target_count=target)
        except RuntimeError:
            continue
        spans = []
        for index, start_px in enumerate(dividers):
            end_px = dividers[(index + 1) % len(dividers)]
            spans.append((px_to_deg(end_px) - px_to_deg(start_px)) % 360.0)
        span_sum = sum(spans)
        score = abs(span_sum - 360.0) + abs(len(dividers) - target) * 0.01
        if score < best_score:
            best_score = score
            best_count = len(dividers)
    return best_count


def select_dividers(col: np.ndarray, target_count: int = 16) -> list[int]:
    peaks = candidate_peaks(col)
    if not peaks:
        raise RuntimeError("No divider peaks found")

    best_sel: list[int] = []
    for sep in range(40, 400):
        selected: list[int] = []
        for _, idx in peaks:
            if all(abs(idx - existing) >= sep for existing in selected):
                selected.append(idx)
        selected.sort()
        if abs(len(selected) - target_count) < abs(len(best_sel) - target_count):
            best_sel = selected

    if len(best_sel) < 8:
        raise RuntimeError(f"Too few dividers detected ({len(best_sel)})")

    refined: list[int] = []
    for peak in best_sel:
        lo = max(1, peak - 25)
        hi = min(len(col) - 2, peak + 25)
        refined.append(lo + int(np.argmax(col[lo : hi + 1])))
    return refined


def px_to_deg(px: int) -> float:
    return px * DEG_PER_PX


def parse_digit(text: str) -> int | None:
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    if len(digits) >= 2:
        value = int(digits[:2])
        if 1 <= value <= 14:
            return value
    value = int(digits[0])
    return value if 1 <= value <= 14 else None


def wedge_patch(
    gray: np.ndarray,
    cx: int,
    cy: int,
    r_inner: float,
    r_outer: float,
    start_deg: float,
    end_deg: float,
) -> np.ndarray | None:
    span = (end_deg - start_deg) % 360.0
    mid = (start_deg + span / 2.0) % 360.0
    size = max(gray.shape) * 2
    matrix = cv2.getRotationMatrix2D((cx, cy), -mid, 1.0)
    matrix[0, 2] += size // 2 - cx
    matrix[1, 2] += size // 2 - cy
    center_x = size // 2
    center_y = size // 2
    rotated = cv2.warpAffine(gray, matrix, (size, size), borderValue=255)
    half_width = max(
        30,
        int(((r_inner + r_outer) / 2.0) * math.sin(math.radians(max(span / 2.0, 0.5))) + 18),
    )
    crop = rotated[
        center_y - half_width : center_y + half_width,
        int(center_x + r_inner) : int(center_x + r_outer),
    ]
    if crop.size == 0:
        return None
    return cv2.resize(crop, (320, 420), interpolation=cv2.INTER_CUBIC)


def largest_digit_patch(binary: np.ndarray) -> np.ndarray | None:
    inv = 255 - binary if np.mean(binary) > 127 else binary.copy()
    contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    height, width = binary.shape
    best = None
    best_score = 0.0
    for contour in contours:
        x, y, cw, ch = cv2.boundingRect(contour)
        area = cw * ch
        if area < 100 or ch < height * 0.08 or cw < width * 0.03:
            continue
        center_x = x + cw / 2
        if center_x < width * 0.15 or center_x > width * 0.85:
            continue
        score = area * (1.0 - abs(center_x - width / 2) / (width / 2))
        if score > best_score:
            best_score = score
            best = inv[y : y + ch, x : x + cw]
    if best is None:
        return None
    return cv2.resize(best, (48, 72), interpolation=cv2.INTER_AREA)


def normalize_patch(patch: np.ndarray) -> np.ndarray:
    return cv2.resize(patch, (48, 72), interpolation=cv2.INTER_AREA)


def ocr_digit_with_confidence(image: np.ndarray) -> tuple[int | None, float]:
    best_label: int | None = None
    best_conf = -1.0
    configs = (
        r"--psm 8 -c tessedit_char_whitelist=0123456789",
        r"--psm 13 -c tessedit_char_whitelist=0123456789",
        r"--psm 10 -c tessedit_char_whitelist=0123456789",
    )
    for rotation in (
        cv2.ROTATE_90_CLOCKWISE,
        cv2.ROTATE_90_COUNTERCLOCKWISE,
        None,
    ):
        base = cv2.rotate(image, rotation) if rotation is not None else image
        scaled = cv2.resize(base, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
        blur = cv2.GaussianBlur(scaled, (3, 3), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        for config in configs:
            data = pytesseract.image_to_data(
                binary,
                config=config,
                output_type=pytesseract.Output.DICT,
            )
            for text, conf in zip(data["text"], data["conf"]):
                text = text.strip()
                if not text:
                    continue
                value = parse_digit(text)
                confidence = float(conf)
                if value is not None and confidence > best_conf:
                    best_conf = confidence
                    best_label = value
    return best_label, best_conf


def match_digit(
    patch: np.ndarray | None, templates: dict[int, np.ndarray]
) -> tuple[int | None, float]:
    if patch is None or not templates:
        return None, 0.0
    norm = normalize_patch(patch)
    best_label = None
    best_score = -1.0
    for label, template in templates.items():
        tpl = normalize_patch(template)
        result = cv2.matchTemplate(norm, tpl, cv2.TM_CCOEFF_NORMED)
        score = float(result.max())
        if score > best_score:
            best_score = score
            best_label = label
    if best_score < 0.18:
        return None, best_score
    return best_label, best_score


def recognize_wedge_label(
    gray: np.ndarray,
    cx: int,
    cy: int,
    r_inner: float,
    r_outer: float,
    start_deg: float,
    end_deg: float,
    templates: dict[int, np.ndarray],
) -> int | None:
    patch = wedge_patch(gray, cx, cy, r_inner, r_outer, start_deg, end_deg)
    if patch is None:
        return None

    label, confidence = ocr_digit_with_confidence(patch)
    if label is not None and confidence >= 0:
        return label

    blur = cv2.GaussianBlur(patch, (3, 3), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    matched, score = match_digit(largest_digit_patch(binary), templates)
    if matched is not None and score >= 0.18:
        return matched
    return label


def build_templates_from_result(result: DiscResult, gray: np.ndarray) -> dict[int, np.ndarray]:
    templates: dict[int, list[np.ndarray]] = {}
    cx, cy = result.center
    for wedge in result.wedges:
        if wedge.label is None:
            continue
        patch = wedge_patch(
            gray, cx, cy, result.r_inner, result.r_outer, wedge.start_deg, wedge.end_deg
        )
        if patch is None:
            continue
        blur = cv2.GaussianBlur(patch, (3, 3), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        digit_patch = largest_digit_patch(binary)
        if digit_patch is not None:
            templates.setdefault(wedge.label, []).append(normalize_patch(digit_patch))

    merged: dict[int, np.ndarray] = {}
    for label, patches in templates.items():
        merged[label] = normalize_patch(
            np.median(np.stack(patches, axis=0), axis=0).astype(np.uint8)
        )
    return merged


def parse_center_lines(data: dict) -> list[str]:
    lines: dict[tuple[int, int, int], list[str]] = {}
    for text, block, par, line, conf in zip(
        data["text"],
        data["block_num"],
        data["par_num"],
        data["line_num"],
        data["conf"],
    ):
        text = text.strip()
        if not text or float(conf) < 0:
            continue
        key = (block, par, line)
        lines.setdefault(key, []).append(text)

    line_items: list[tuple[int, str]] = []
    for key, words in lines.items():
        idxs = [
            i
            for i in range(len(data["text"]))
            if (
                data["block_num"][i],
                data["par_num"][i],
                data["line_num"][i],
            )
            == key
            and data["text"][i].strip()
        ]
        if not idxs:
            continue
        top = min(int(data["top"][i]) for i in idxs)
        line_items.append((top, " ".join(words)))
    line_items.sort()
    return [line for _, line in line_items]


def extract_name_position(raw_lines: list[str]) -> tuple[str, str]:
    name = ""
    position = ""
    joined = " ".join(raw_lines).upper()
    joined_clean = re.sub(r"[^A-Z0-9 ]", " ", joined)
    joined_clean = re.sub(r"\s+", " ", joined_clean).strip()

    for pos in POSITIONS:
        if pos in joined_clean:
            position = pos.title()
            break

    for line in raw_lines:
        upper = re.sub(r"[^A-Z ]", "", line.upper()).strip()
        if not upper or len(upper) < 5:
            continue
        if any(token in upper for token in ("ELECTED", "HALL", "FAME", "BASEBALL", "IN 19")):
            continue
        if upper in POSITIONS:
            continue
        if not name:
            name = upper

    if not name:
        tokens = [token for token in joined_clean.split() if len(token) > 1]
        skip = {
            "ELECTED",
            "TO",
            "THE",
            "BASEBALL",
            "HALL",
            "OF",
            "FAME",
            "IN",
            "RIGHT",
            "LEFT",
            "CENTER",
            "FIELD",
            "FIRST",
            "SECOND",
            "THIRD",
            "BASE",
            "CATCHER",
            "PITCHER",
            "SHORTSTOP",
            "OUTFIELD",
            "INFIELD",
            "MANAGER",
        }
        name_tokens = [token for token in tokens if token not in skip and not token.isdigit()]
        if len(name_tokens) >= 2:
            name = " ".join(name_tokens[:2])

    return name, position


def ocr_center_text(gray: np.ndarray, cx: int, cy: int, radius: int) -> tuple[str, str]:
    inner_radius = int(radius * 0.40)
    mask = np.zeros_like(gray)
    cv2.circle(mask, (cx, cy), inner_radius, 255, -1)
    masked = cv2.bitwise_and(gray, gray, mask=mask)
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return "", ""
    pad = 10
    crop = masked[
        max(0, ys.min() - pad) : min(gray.shape[0], ys.max() + pad),
        max(0, xs.min() - pad) : min(gray.shape[1], xs.max() + pad),
    ]

    best_name = ""
    best_position = ""
    for rotation in (None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE):
        base = cv2.rotate(crop, rotation) if rotation is not None else crop
        up = cv2.resize(base, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
        blur = cv2.GaussianBlur(up, (3, 3), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        for config in ("--psm 6", "--psm 11"):
            data = pytesseract.image_to_data(
                binary, config=config, output_type=pytesseract.Output.DICT
            )
            name, position = extract_name_position(parse_center_lines(data))
            if len(name) > len(best_name):
                best_name = name
            if len(position) > len(best_position):
                best_position = position

    return best_name, best_position


def load_override(path: Path | None) -> dict | None:
    if path is None or not path.exists():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"Override file must be a JSON object: {path}")
    return payload


def override_path_for_scan(scan_path: Path) -> Path | None:
    override_dir = Path(__file__).resolve().parent / "overrides"
    candidates = [
        override_dir / f"{scan_path.stem}.json",
        override_dir / f"{normalize_scan_stem(scan_path.stem)}.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def apply_wedge_overrides(result: DiscResult, override: dict | None) -> None:
    if not override:
        return
    labels = override.get("wedge_labels")
    if not isinstance(labels, list):
        return
    if len(labels) != len(result.wedges):
        result.warnings.append(
            f"Override wedge_labels length {len(labels)} != {len(result.wedges)} wedges"
        )
        return
    for wedge, label in zip(result.wedges, labels):
        if isinstance(label, int) and 1 <= label <= 14:
            wedge.label = label
        elif isinstance(label, str) and label.isdigit():
            wedge.label = int(label)


def analyze_disc(
    image_path: Path,
    templates: dict[int, np.ndarray] | None = None,
    target_wedges: int | None = None,
    override: dict | None = None,
) -> tuple[DiscResult, np.ndarray, np.ndarray]:
    image = cv2.imread(str(image_path))
    if image is None:
        raise RuntimeError(f"Could not read image: {image_path}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cx, cy, radius = detect_disc(gray)
    r_inner = radius * 0.44
    r_outer = radius * 0.93
    polar = polar_unwrap(gray, cx, cy, r_inner, r_outer)
    col = column_energy(polar)
    wedge_count = target_wedges
    if override and override.get("wedge_count"):
        wedge_count = int(override["wedge_count"])
    elif wedge_count is None:
        wedge_count = choose_wedge_count(col)
    divider_px = select_dividers(col, target_count=wedge_count)

    result = DiscResult(
        source=image_path.name,
        center=(cx, cy),
        radius=radius,
        r_inner=r_inner,
        r_outer=r_outer,
    )

    wedges: list[Wedge] = []
    for index, start_px in enumerate(divider_px):
        end_px = divider_px[(index + 1) % len(divider_px)]
        wedge = Wedge(
            index=index,
            start_deg=px_to_deg(start_px),
            end_deg=px_to_deg(end_px),
        )
        wedge.label = recognize_wedge_label(
            gray,
            cx,
            cy,
            r_inner,
            r_outer,
            wedge.start_deg,
            wedge.end_deg,
            templates or {},
        )
        wedges.append(wedge)
    result.wedges = wedges

    total_span = sum(w.span_deg for w in wedges)
    if abs(total_span - 360.0) > GEOMETRY_TOLERANCE_DEG:
        result.warnings.append(
            f"Wedge spans sum to {total_span:.2f}° (expected 360° ± {GEOMETRY_TOLERANCE_DEG}°)"
        )

    apply_wedge_overrides(result, override)

    labeled = sum(1 for w in wedges if w.label is not None)
    if labeled < len(wedges):
        result.warnings.append(f"Only {labeled}/{len(wedges)} wedge labels recognized")

    player, position = ocr_center_text(gray, cx, cy, radius)
    if override:
        player = str(override.get("player") or player).strip()
        position = str(override.get("position") or position).strip()
    result.player = player
    result.position = position
    if not player:
        result.warnings.append("Player name not detected")
    if not position:
        result.warnings.append("Position not detected")

    degree_total = sum(result.totals().values())
    if degree_total > 0 and abs(degree_total - 360.0) > GEOMETRY_TOLERANCE_DEG:
        result.warnings.append(
            f"Labeled degrees sum to {degree_total:.2f}° (expected 360° ± {GEOMETRY_TOLERANCE_DEG}°)"
        )

    return result, image, polar


def draw_review(result: DiscResult, image: np.ndarray) -> np.ndarray:
    vis = image.copy()
    cx, cy = result.center
    cv2.circle(vis, (cx, cy), 10, (0, 0, 255), -1)
    cv2.circle(vis, (cx, cy), result.radius, (0, 255, 0), 2)
    cv2.circle(vis, (cx, cy), int(result.r_inner), (255, 128, 0), 1)
    cv2.circle(vis, (cx, cy), int(result.r_outer), (255, 128, 0), 1)

    for wedge in result.wedges:
        start_rad = math.radians(wedge.start_deg)
        x0 = int(cx + result.r_outer * math.cos(start_rad))
        y0 = int(cy + result.r_outer * math.sin(start_rad))
        cv2.line(vis, (cx, cy), (x0, y0), (255, 0, 255), 2)

        mid_rad = math.radians(wedge.mid_deg)
        label_r = (result.r_inner + result.r_outer) / 2
        lx = int(cx + label_r * math.cos(mid_rad))
        ly = int(cy + label_r * math.sin(mid_rad))
        label = "?" if wedge.label is None else str(wedge.label)
        text = f"{label} {wedge.span_deg:.1f}"
        cv2.putText(vis, text, (lx - 30, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(vis, text, (lx - 30, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 1, cv2.LINE_AA)

    header = f"{result.player or 'UNKNOWN'} | {result.position or 'UNKNOWN'}"
    cv2.rectangle(vis, (0, 0), (vis.shape[1], 42), (255, 255, 255), -1)
    cv2.putText(vis, header, (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
    if result.warnings:
        warn = "; ".join(result.warnings[:2])
        cv2.putText(
            vis,
            warn,
            (12, vis.shape[0] - 12),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
    return vis


def normalize_scan_stem(stem: str) -> str:
    return re.sub(r"(?:\s+copy)+$", "", stem, flags=re.I)


def iter_scan_paths(scan_dir: Path) -> list[Path]:
    deduped: dict[str, Path] = {}
    for path in sorted(scan_dir.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        stem = normalize_scan_stem(path.stem)
        existing = deduped.get(stem)
        if existing is None:
            deduped[stem] = path
            continue
        if path.suffix.lower() in {".jpg", ".jpeg"} and existing.suffix.lower() == ".png":
            deduped[stem] = path
    return [deduped[key] for key in sorted(deduped)]


def write_csv(path: Path, rows: list[dict[str, str | float]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def result_row(result: DiscResult, *, probabilities: bool = False) -> dict[str, str | float]:
    totals = result.probabilities() if probabilities else result.totals()
    row: dict[str, str | float] = {
        "source_file": result.source,
        "player": result.player,
        "position": result.position,
    }
    for col in RESULT_COLUMNS:
        value = totals.get(int(col), 0.0)
        row[col] = round(value, 4 if probabilities else 2)
    return row


def disc_id_from_scan(scan_path: Path) -> str:
    return re.sub(r"[^\w.-]+", "_", normalize_scan_stem(scan_path.stem))


OUTCOME_GROUPS = (
    ("homeRun", "Home Run", ("1",)),
    ("triple", "Triple", ("5",)),
    ("double", "Double", ("11",)),
    ("walk", "Walk", ("9",)),
    ("strikeout", "Strikeout", ("10",)),
    ("singles", "Singles", ("7", "13")),
    ("outs", "Outs", ("2", "3", "4", "6", "8", "12", "14")),
)


def build_outcome_summary(result: DiscResult) -> list[dict[str, object]]:
    totals = result.totals()
    probs = result.probabilities()
    summary: list[dict[str, object]] = []
    for key, label, numbers in OUTCOME_GROUPS:
        nums = list(numbers)
        summary.append(
            {
                "key": key,
                "label": label,
                "numbers": nums,
                "degrees": round(sum(totals.get(int(n), 0.0) for n in nums), 2),
                "probability": round(sum(probs.get(int(n), 0.0) for n in nums), 4),
            }
        )
    return summary


def detect_player_metadata(result: DiscResult, override: dict | None) -> tuple[bool, int | None, bool, str]:
    joined = f"{result.player} {result.position}".upper()
    hall = bool(override and override.get("hall_of_fame"))
    hof_year = override.get("hof_year") if override else None
    if isinstance(hof_year, str) and hof_year.isdigit():
        hof_year = int(hof_year)
    if not hall and "HALL OF FAME" in joined:
        hall = True
    switch = bool(override and override.get("switch_hitter"))
    if not switch and "1ST BASE" in joined and "2ND BASE" in joined:
        switch = True
    group = override.get("collection_group") if override else None
    if not group:
        group = "hallOfFame" if hall else "active"
    return hall, hof_year if isinstance(hof_year, int) else None, switch, group


def log_activity(output_dir: Path, message: str) -> None:
    payload = {"message": message, "at": datetime.now(timezone.utc).isoformat()}
    with (output_dir / "activity.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")


def set_live_state(output_dir: Path, *, running: bool, current: dict | None = None) -> None:
    payload = {
        "extractionRunning": running,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "current": current,
    }
    (output_dir / "live-state.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def append_csv_row(path: Path, row: dict[str, str | float]) -> None:
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()
        header = lines[0] if lines else ",".join(CSV_FIELDNAMES)
        body = [line for line in lines[1:] if line.split(",")[0] != str(row["source_file"])]
        rows = [header, *body, ",".join(str(row[col]) for col in CSV_FIELDNAMES)]
        path.write_text("\n".join(rows) + "\n", encoding="utf-8")
    else:
        write_csv(path, [row])


def preserve_disc(
    result: DiscResult,
    scan_path: Path,
    output_dir: Path,
    review_name: str,
    override: dict | None = None,
) -> None:
    archive_dir = output_dir / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)

    disc_id = disc_id_from_scan(scan_path)
    totals = result.totals()
    degree_sum = sum(totals.values())
    labeled = sum(1 for wedge in result.wedges if wedge.label is not None)
    geometry_ok = abs(degree_sum - 360.0) <= GEOMETRY_TOLERANCE_DEG if degree_sum > 0 else False
    ocr_status = "complete" if labeled >= max(10, len(result.wedges) - 2) else "partial"
    validation_status = "validated" if geometry_ok and result.player else "warning"
    hall, hof_year, switch, collection_group = detect_player_metadata(result, override)

    confidence = confidence_from_result(
        result,
        geometry_ok=geometry_ok,
        ocr_status=ocr_status,
        validation_status="validated" if geometry_ok and result.player else "warning",
    )

    project_root = Path(__file__).resolve().parent.parent.parent
    player_name = result.player.strip() or disc_id
    position_name = result.position.strip() or "Unknown"
    try:
        canonical_file = copy_canonical_scan(
            scan_path,
            player=player_name,
            position=position_name,
            disc_id=disc_id,
            output_dir=output_dir,
            project_root=project_root,
        )
    except OSError as exc:
        canonical_file = None
        result.warnings.append(f"Canonical scan copy failed: {exc}")

    record = {
        "id": disc_id,
        "sourceFile": scan_path.name,
        "canonicalFile": canonical_file,
        "player": result.player,
        "position": result.position,
        "preservedAt": datetime.now(timezone.utc).isoformat(),
        "hallOfFame": hall,
        "hofYear": hof_year,
        "switchHitter": switch,
        "collectionGroup": collection_group,
        "geometryStatus": "ok" if geometry_ok else ("warning" if degree_sum >= 200 else "failed"),
        "ocrStatus": ocr_status,
        "validationStatus": validation_status,
        **confidence,
        "degrees": {str(k): round(v, 2) for k, v in totals.items()},
        "probabilities": {str(k): round(v, 4) for k, v in result.probabilities().items()},
        "outcomeSummary": build_outcome_summary(result),
        "wedgeCount": len(result.wedges),
        "degreesSum": round(degree_sum, 2) if degree_sum > 0 else None,
        "largestOutcomeDegrees": round(max(totals.values()) if totals else 0.0, 2),
        "smallestHomeRunDegrees": round(totals.get(1, 0.0), 2) if totals.get(1, 0.0) > 0 else None,
        "reviewImageFilename": review_name,
        "warnings": result.warnings,
    }
    (archive_dir / f"{disc_id}.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    append_csv_row(output_dir / "allstar_players.csv", result_row(result, probabilities=False))
    append_csv_row(
        output_dir / "allstar_players_probabilities.csv",
        result_row(result, probabilities=True),
    )
    post_preserve_after_disc(output_dir, disc_id)


def default_intel_paths(output_dir: Path) -> tuple[Path, Path]:
    """Resolve intelligence output dir and player registry relative to repo root."""
    tool_root = Path(__file__).resolve().parent
    project_root = tool_root.parent.parent
    intel_dir = project_root / "data" / "ops" / "allstar" / "intelligence" / "players"
    registry_path = project_root / "data" / "ops" / "allstar" / "intelligence" / "player-registry.json"
    return intel_dir, registry_path


def post_preserve_after_disc(output_dir: Path, disc_id: str) -> None:
    archive_path = output_dir / "archive" / f"{disc_id}.json"
    if not archive_path.exists():
        return
    intel_dir, registry_path = default_intel_paths(output_dir)
    project_root = Path(__file__).resolve().parent.parent.parent
    try:
        from harvest_hooks import post_preserve

        record = json.loads(archive_path.read_text(encoding="utf-8"))
        post_preserve(output_dir, intel_dir, registry_path, project_root, record)
    except Exception as exc:  # noqa: BLE001
        log_activity(output_dir, f"⚾ Post-preserve warning for {disc_id}: {exc}")


def maybe_write_intelligence(
    output_dir: Path,
    disc_id: str,
    *,
    intel_dir: Path | None = None,
    registry_path: Path | None = None,
) -> None:
    archive_path = output_dir / "archive" / f"{disc_id}.json"
    if not archive_path.exists():
        return
    resolved_intel, resolved_registry = default_intel_paths(output_dir)
    intel_dir = intel_dir or resolved_intel
    registry_path = registry_path or resolved_registry
    try:
        from player_intel import write_intelligence

        record = json.loads(archive_path.read_text(encoding="utf-8"))
        write_intelligence(record, intel_dir, registry_path)
    except Exception as exc:  # noqa: BLE001
        log_activity(output_dir, f"⚾ Intelligence generation warning for {disc_id}: {exc}")


def write_manifest(output_dir: Path, *, source_files: list[str], phase: str = "batch") -> None:
    manifest = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "extractorVersion": "1.2.0",
        "pipeline": "disc-extraction",
        "phase": phase,
        "processedFiles": source_files,
        "modules": {
            "discExtraction": "active",
            "mlbComparison": "planned",
            "gameSimulation": "planned",
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def process_scan(
    scan_path: Path,
    output_dir: Path,
    templates: dict[int, np.ndarray] | None = None,
    override: dict | None = None,
) -> DiscResult:
    review_dir = output_dir / "review"
    review_dir.mkdir(parents=True, exist_ok=True)

    result, image, _ = analyze_disc(scan_path, templates=templates, override=override)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    review = draw_review(result, image)
    review_name = re.sub(r"[^\w.-]+", "_", scan_path.stem) + ".jpg"
    cv2.imwrite(str(review_dir / review_name), review)

    if templates is not None:
        templates.update(build_templates_from_result(result, gray))

    if result.warnings:
        print(f"  warnings: {'; '.join(result.warnings)}")

    return result


def run_single(
    scan_path: Path,
    output_dir: Path,
    *,
    override_path: Path | None = None,
    append: bool = True,
) -> DiscResult:
    if not scan_path.exists():
        raise RuntimeError(f"Scan not found: {scan_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    override = load_override(override_path or override_path_for_scan(scan_path))
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

    print(f"Processing single disc: {scan_path.name}")
    result = process_scan(scan_path, output_dir, override=override)
    log_activity(output_dir, "⚾ Geometry complete")
    log_activity(output_dir, "⚾ OCR complete")

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

    review_name = re.sub(r"[^\w.-]+", "_", scan_path.stem) + ".jpg"
    preserve_disc(result, scan_path, output_dir, review_name, override=override)
    log_activity(output_dir, f"⚾ Saved {result.player or scan_path.stem} to archive")

    manifest_path = output_dir / "manifest.json"
    source_files = [scan_path.name]
    if manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            prior = existing.get("processedFiles") or []
            source_files = list(dict.fromkeys([*prior, scan_path.name]))
        except json.JSONDecodeError:
            pass
    write_manifest(output_dir, source_files=source_files, phase="single-disc")
    set_live_state(output_dir, running=False, current=None)
    print(f"Preserved {result.player or scan_path.name} → {output_dir}")
    return result


def run_batch(scan_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    templates: dict[int, np.ndarray] = {}
    source_files: list[str] = []

    set_live_state(output_dir, running=True, current=None)
    log_activity(output_dir, "⚾ Batch extraction started")

    for path in iter_scan_paths(scan_dir):
        override = load_override(override_path_for_scan(path))
        player_hint = str(override.get("player") if override else path.stem)
        print(f"Processing {path.name}...")
        set_live_state(
            output_dir,
            running=True,
            current={
                "player": player_hint,
                "position": str(override.get("position") if override else ""),
                "scanFilename": path.name,
                "stage": "processing",
                "geometryStatus": "processing",
                "ocrStatus": "processing",
                "validationStatus": "processing",
                "outcomeSummary": [],
            },
        )
        log_activity(output_dir, f"⚾ Processing {player_hint}...")
        try:
            result = process_scan(path, output_dir, templates=templates, override=override)
            log_activity(output_dir, "⚾ Geometry complete")
            log_activity(output_dir, "⚾ OCR complete")
            review_name = re.sub(r"[^\w.-]+", "_", path.stem) + ".jpg"
            preserve_disc(result, path, output_dir, review_name, override=override)
            log_activity(output_dir, f"⚾ Saved {result.player or path.stem} to archive")
            source_files.append(path.name)
        except Exception as exc:  # noqa: BLE001
            print(f"  FAILED: {exc}")
            log_activity(output_dir, f"⚾ Failed on {path.name}: {exc}")
            continue

    write_manifest(output_dir, source_files=source_files, phase="batch")
    log_activity(output_dir, f"⚾ Batch complete — {len(source_files)} discs preserved")
    set_live_state(output_dir, running=False, current=None)
    print(f"Preserved {len(source_files)} discs to {output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--scans",
        type=Path,
        default=Path("/Users/bobhopp/Documents/All Star Baseball/Scans"),
        help="Directory containing disc scan images",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "output",
        help="Output directory for CSV files and review images",
    )
    parser.add_argument(
        "--scan",
        type=Path,
        default=None,
        help="Process one scan file instead of the full batch",
    )
    parser.add_argument(
        "--override",
        type=Path,
        default=None,
        help="JSON override with player, position, and wedge_labels",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="When using --scan, merge into existing CSV output",
    )
    parser.add_argument(
        "--queue",
        action="store_true",
        help="Run preservation queue (pause/resume via --pause / --resume)",
    )
    parser.add_argument(
        "--pause",
        action="store_true",
        help="Pause an active preservation queue",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume a paused preservation queue",
    )
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="Re-process failed queue items",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process completed discs",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent.parent,
        help="Retroverse project root for bundled intelligence output",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    intel_dir = args.project_root / "data" / "ops" / "allstar" / "intelligence" / "players"
    registry_path = args.project_root / "data" / "ops" / "allstar" / "intelligence" / "player-registry.json"

    if args.pause:
        from preserve_queue import pause_queue

        pause_queue(args.output)
        return
    if args.resume:
        from preserve_queue import resume_queue, run_queue

        resume_queue(args.output)
        run_queue(
            args.scans,
            args.output,
            intel_dir=intel_dir,
            registry_path=registry_path,
            project_root=args.project_root,
            retry_failed=args.retry_failed,
            force=args.force,
        )
        return
    if args.queue:
        from preserve_queue import run_queue

        run_queue(
            args.scans,
            args.output,
            intel_dir=intel_dir,
            registry_path=registry_path,
            project_root=args.project_root,
            retry_failed=args.retry_failed,
            force=args.force,
        )
        return
    if args.scan:
        run_single(args.scan, args.output, override_path=args.override, append=args.append)
        return
    run_batch(args.scans, args.output)


if __name__ == "__main__":
    main()
