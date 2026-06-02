# Media Lab (local transcription)

Phase 1: video → transcript → chapters → files under `RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}/`.

## Install (once)

```bash
brew install ffmpeg
pip install faster-whisper
```

Optional env:

- `MEDIA_LAB_PYTHON` — default `python3`
- `MEDIA_LAB_WHISPER_MODEL` — default `base` (`tiny`, `small`, `medium`, …)

## CLI

```bash
npm run ops:media-lab -- --year 1967 --video /path/to/clip.mp4
```

## Web UI

Ops → **media lab** (`/ops/media-lab`) with `RETROVERSE_OPS=1`.

## Chapters & segment labels

1. **Generate Chapters** — content-aware `chapters.csv` (TV titles, commercials, etc.)
2. **Generate Segment Labels** — human-readable export names:

   - `segment-labels.json` — `[{ start, end, label }]`
   - `segment-labels.txt` — tab-separated + labels-only block for LosslessCut
   - `chapters.csv` — synced with labels (`TV - Batman`, `Commercial - Rice Krispies`, …)

```bash
npx tsx tools/media-lab/build-chapters-cli.ts --output-dir /path/to/job
npx tsx tools/media-lab/build-segment-labels-cli.ts --output-dir /path/to/job
```

## Outputs per job

| File | Purpose |
|------|---------|
| `transcript.txt` | Plain text |
| `captions.srt` / `captions.vtt` | Subtitles |
| `chapters.csv` | LosslessCut import (`start,end,title`) |
| `segments.json` | Whisper segments (for re-chapter) |
| `job.json` | Metadata |
