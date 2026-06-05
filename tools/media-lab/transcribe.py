#!/usr/bin/env python3
"""
Media Lab — local transcription (ffmpeg + faster-whisper).

Install:
  brew install ffmpeg
  pip install faster-whisper

Usage:
  python3 tools/media-lab/transcribe.py --video /path/to/file.mp4 --output-dir /path/out \\
    --year 1967 --job-slug my-job --source-filename file.mp4
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def sec_to_timecode(sec: float) -> str:
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def sec_to_srt_time(sec: float) -> str:
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def extract_audio(video: Path, wav: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        str(wav),
    ]
    log("Running ffmpeg…")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def transcribe(wav: Path, model_name: str):
    from faster_whisper import WhisperModel

    log(f"Loading whisper model '{model_name}'…")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    log("Transcribing…")
    segments_iter, info = model.transcribe(
        str(wav),
        beam_size=5,
        vad_filter=True,
    )
    segments = []
    for seg in segments_iter:
        text = (seg.text or "").strip()
        if not text:
            continue
        segments.append(
            {
                "start": round(float(seg.start), 3),
                "end": round(float(seg.end), 3),
                "text": text,
            }
        )
    duration = float(info.duration) if info.duration else None
    return segments, duration


def write_transcript(path: Path, segments: list[dict]) -> None:
    lines = [s["text"] for s in segments]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def write_srt(path: Path, segments: list[dict]) -> None:
    blocks = []
    for i, s in enumerate(segments, 1):
        blocks.append(
            f"{i}\n"
            f"{sec_to_srt_time(s['start'])} --> {sec_to_srt_time(s['end'])}\n"
            f"{s['text']}\n"
        )
    path.write_text("\n".join(blocks), encoding="utf-8")


def write_vtt(path: Path, segments: list[dict]) -> None:
    lines = ["WEBVTT", ""]
    for s in segments:
        start = sec_to_timecode(s["start"]).replace(".", ",")
        end = sec_to_timecode(s["end"]).replace(".", ",")
        lines.append(f"{start} --> {end}")
        lines.append(s["text"])
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def build_chapters_via_node(output_dir: Path, chapter_mode: str = "content") -> int:
    """Chapters from segments.json (shared TS logic)."""
    repo_root = Path(__file__).resolve().parents[2]
    cli = repo_root / "tools" / "media-lab" / "build-chapters-cli.ts"
    mode = chapter_mode if chapter_mode in ("content", "commercial") else "content"
    cmd = ["npx", "--yes", "tsx", str(cli), "--output-dir", str(output_dir), "--mode", mode]
    log(f"Building chapters (mode={mode})…")
    proc = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True)
    if proc.returncode != 0:
        log(proc.stderr or proc.stdout or "chapter build failed")
        return proc.returncode
    return 0


def write_chapters_csv(path: Path, chapters: list[dict]) -> None:
    """LosslessCut-friendly: start/end as HH:MM:SS.mmm"""
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["start", "end", "title"])
        for ch in chapters:
            w.writerow(
                [
                    sec_to_timecode(ch["start"]),
                    sec_to_timecode(ch["end"]),
                    ch["title"],
                ]
            )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--video", required=True)
    p.add_argument("--output-dir", required=True)
    p.add_argument("--year", type=int, required=True)
    p.add_argument("--job-slug", required=True)
    p.add_argument("--source-filename", required=True)
    p.add_argument("--model", default="base")
    args = p.parse_args()

    video = Path(args.video).resolve()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    if not video.is_file():
        log(f"Video not found: {video}")
        return 1

    wav = out / "_audio_16k.wav"
    try:
        extract_audio(video, wav)
        segments, duration = transcribe(wav, args.model)
    finally:
        if wav.exists():
            wav.unlink()

    (out / "segments.json").write_text(json.dumps(segments, indent=2), encoding="utf-8")
    write_transcript(out / "transcript.txt", segments)
    write_srt(out / "captions.srt", segments)
    write_vtt(out / "captions.vtt", segments)

    chapter_mode = os.environ.get("MEDIA_LAB_CHAPTER_MODE", "content").strip()
    if build_chapters_via_node(out, chapter_mode) != 0:
        return 1

    chapters_path = out / "chapters.csv"
    chapter_count = 0
    if chapters_path.is_file():
        chapter_count = max(0, sum(1 for _ in chapters_path.open(encoding="utf-8")) - 1)

    job = {
        "year": args.year,
        "jobSlug": args.job_slug,
        "sourceVideo": str(video),
        "sourceFilename": args.source_filename,
        "outputDir": str(out),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
        "durationSeconds": duration,
        "segmentCount": len(segments),
        "chapterCount": chapter_count,
        "files": [
            "transcript.txt",
            "captions.srt",
            "captions.vtt",
            "chapters.csv",
            "segments.json",
            "job.json",
        ],
    }
    (out / "job.json").write_text(json.dumps(job, indent=2), encoding="utf-8")

    print(json.dumps(job))
    return 0


if __name__ == "__main__":
    sys.exit(main())
