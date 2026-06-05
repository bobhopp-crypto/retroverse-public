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

**Chapter modes** (UI selector or CLI `--mode`):

| Mode | Use for |
|------|---------|
| `content` | TV retrospectives, mixed topics (default) |
| `commercial` | Vintage ad reels — ~30–90s spots, same-brand merge |

1. **Generate Chapters** — `chapters.csv` for LosslessCut
2. **Generate Segment Labels** — human-readable export names:

   - `segment-labels.json` — `[{ start, end, label }]`
   - `segment-labels.txt` — tab-separated + labels-only block for LosslessCut
   - `chapters.csv` — synced with labels (`TV - Batman`, `Commercial - Rice Krispies`, …)

```bash
npx tsx tools/media-lab/build-chapters-cli.ts --output-dir /path/to/job --mode commercial
npx tsx tools/media-lab/build-segment-labels-cli.ts --output-dir /path/to/job

Test commercial vs content counts:

```bash
npx tsx tools/media-lab/test-commercial-chapters.ts --output-dir /path/to/job
```

## Editorial review (Phase 2)

After chapters exist, open **Editorial review** on `/ops/media-lab`:

- Chapter table (merge, split, rename, delete, preview)
- **Suggest merges** — rule-based adjacent-pair analysis with confidence %
- Review filters: under 20s, same-brand neighbors, needs review
- **Export for LosslessCut** — writes `chapters.csv` + `segment-labels.txt`

API: `GET/PUT /api/ops/media-lab/editorial`, `POST …/export`, `POST …/suggest-merges`
```

## Outputs per job

| File | Purpose |
|------|---------|
| `transcript.txt` | Plain text |
| `captions.srt` / `captions.vtt` | Subtitles |
| `chapters.csv` | LosslessCut import (`start,end,title`) |
| `segments.json` | Whisper segments (for re-chapter) |
| `job.json` | Metadata |
