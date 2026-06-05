# Media Lab (local transcription)

**Transcribe once.** Everything after reads `segments.json` and is nearly instant.

## Pipeline

| Step | Reads | Writes | Retranscribe? |
|------|-------|--------|---------------|
| Transcribe (once) | video | `segments.json`, `transcript.txt`, captions | yes (slow) |
| Regenerate chapters | `segments.json` | `chapters.csv` | no |
| Regenerate labels | `segments.json` + chapters | `segment-labels.*` | no |
| Editorial review | segments + chapters | `editorial-meta.json` (review status) | no |
| Tag / merge heuristics | segments + chapters | in-memory (instant) | no |
| Filmstrip frames | video + chapters | `filmstrip/` cache | no |

Reload any previous job from the **Saved jobs** dropdown — no video upload required.

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

**Chapter modes** (UI selector or CLI `--mode`):

| Mode | Use for |
|------|---------|
| `content` | TV retrospectives, mixed topics (default) |
| `commercial` | Vintage ad reels — ~30–90s spots, same-brand merge |

1. **Regenerate Chapters** — `chapters.csv` from `segments.json`
2. **Regenerate Labels** — export filenames from segments + chapters

   - `segment-labels.json` — `[{ start, end, label }]`
   - `segment-labels.txt` — tab-separated + labels-only block for LosslessCut
   - `chapters.csv` — synced with labels

```bash
npx tsx tools/media-lab/build-chapters-cli.ts --output-dir /path/to/job --mode commercial
npx tsx tools/media-lab/build-segment-labels-cli.ts --output-dir /path/to/job
```

Test commercial vs content counts:

```bash
npx tsx tools/media-lab/test-commercial-chapters.ts --output-dir /path/to/job
```

After chapters exist, open **Editorial review** on `/ops/media-lab`:

- Chapter table (merge, split, rename, delete, preview)
- **Refresh heuristics** — tag suggestions, merge pairs, review flags (from segments)
- Review filters: under 15s/20s, same-brand neighbors, merge eligible
- **Export for LosslessCut** — writes `chapters.csv` + `segment-labels.txt`

API: `GET /api/ops/media-lab/jobs`, `POST …/jobs/load`, `POST …/chapters`, `GET/PUT …/editorial`, `POST …/editorial/refresh`

## Outputs per job

| File | Purpose |
|------|---------|
| `transcript.txt` | Plain text |
| `captions.srt` / `captions.vtt` | Subtitles |
| `chapters.csv` | LosslessCut import (`start,end,title`) |
| `segments.json` | Whisper segments — **source of truth for all re-runs** |
| `editorial-meta.json` | Review status (Keep / Maybe / Delete / Must Use) |
| `filmstrip/` | Cached preview JPEGs per chapter |
| `job.json` | Metadata |
