# Content Creator Storage Audit

**Date:** 2026-06-08  
**Data root:** `RETROVERSE_DATA` (env `RETROVERSE_DATA_ROOT` or `../RETROVERSE_DATA`)

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Where are generated images stored? | **Session:** `creative_lab/vnext/{runId}/front.png`, `back.png` · **Library:** `content_creator/generations/YYYY-MM-DD/{id}/` |
| Where are exported passes stored? | **Session:** `creative_lab/vnext/{runId}/export/` + zip at run root · **Library:** `content_creator/exports/{id}/` |
| Persisted or cached? | **Persisted to disk** — not ephemeral browser/API cache |
| Auto-delete old generations? | **No** — disk grows until manual cleanup |
| Index / database? | **Was:** per-run `manifest.json` only · **Now:** `content_creator/manifests/index.json` + per-generation manifests |

---

## 1. Generated Images (Before Library)

### Production UI (`/ops/content-creator`)

```
RETROVERSE_DATA/creative_lab/vnext/vnext-{id}/
├── manifest.json
├── front.png          # overwritten on regen
├── back.png
└── export/            # after export
```

- **Write path:** `lib/ops/content-creator/vnext-run.ts` → `writePng()`
- **Serve:** `GET /api/ops/content-creator/vnext/files/{runId}/{...}`
- **No global index** — `runId` lived in client state only

### Classic workflow (`/ops/content-creator/debug/classic`)

```
RETROVERSE_DATA/creative_lab/projects/{slug}/
├── project.json
├── generated/{assetId}.png
└── index.json         # project catalog at creative_lab/index.json
```

---

## 2. Exported Passes

| Workflow | Path |
|----------|------|
| VNext session | `vnext/{runId}/export/final-front.png`, `final-back.png`, `{Event}-pass.zip` |
| VNext library | `content_creator/exports/{id}/final-front.png`, `final-back.png`, zip |
| Classic | `projects/{slug}/exports/finals/` + zip |

Export compositing: `lib/ops/content-creator/vnext-export.ts`  
QR validation report: `export/export-report.json`

---

## 3. Persistence Model

- Images written via `fs/promises` (`writeFile`, `copyFile`)
- OpenAI/Gemini return buffers → immediately saved to disk
- Regeneration **overwrites** session PNGs; library sync copies latest on each generate/regen/export
- HTTP cache: vnext files `no-store`; library files `private, max-age=3600`

---

## 4. Retention / Cleanup

- **No TTL, cron, or prune** for vnext runs or library entries
- Classic projects: `deleteProject()` removes folder + index entry (manual only)
- Old export zips are **not** deleted when regenerating

---

## 5. Asset Library (New)

### Directory layout

```
RETROVERSE_DATA/content_creator/
├── generations/
│   └── YYYY-MM-DD/
│       └── {generationId}/
│           ├── front.png
│           └── back.png
├── exports/
│   └── {generationId}/
│       ├── final-front.png
│       ├── final-back.png
│       └── {Event}-pass.zip
├── manifests/
│   ├── index.json
│   └── {generationId}.json
└── thumbnails/
    └── {generationId}.jpg
```

### Per-generation manifest fields

| Field | Description |
|-------|-------------|
| `id` / `runId` | Generation id (same as vnext run id) |
| `timestamp` | `startedAt` ISO |
| `eraSlug` / `eraName` | RVBR era |
| `creativeDirection` | Composition preset id |
| `promptHash` | SHA-256 (16 chars) of front+back prompt text |
| `sourceArtworkPath` | Absolute vnext working dir |
| `frontImagePath` | Library-relative front PNG |
| `backImagePath` | Library-relative back PNG |
| `exportedCredentialPath` | Library-relative final-front PNG |
| `exportZipPath` | Library-relative zip |
| `favorite` | User flag |

### Index report columns

```
sourceArtworkPath    generated timestamp    era    creative direction
front image path     back image path        exported credential path
```

Example row (tab-separated):

```
/Users/.../creative_lab/vnext/vnext-abc123    2026-06-08T12:00:00.000Z    1970–1973    Collector Card
generations/2026-06-08/vnext-abc123/front.png    generations/2026-06-08/vnext-abc123/back.png
exports/vnext-abc123/Event-pass.zip
```

### Sync hooks

Library updated on:

- `runVNextGenerate`
- `runVNextRegenerateFront` / `runVNextRegenerateBack`
- `runVNextExport`

Code: `lib/ops/content-creator/library/index.ts` → `syncGenerationFromVNext()`

### Backfill

`GET /api/ops/content-creator/library?backfill=1` imports existing vnext runs not yet indexed.

---

## 6. APIs

| Route | Purpose |
|-------|---------|
| `GET /api/ops/content-creator/library` | List / search / backfill |
| `GET /api/ops/content-creator/library/[id]` | Generation detail |
| `PATCH /api/ops/content-creator/library/[id]` | Toggle favorite |
| `POST /api/ops/content-creator/library/[id]/export` | Re-export (requires vnext run on disk) |
| `GET /api/ops/content-creator/library/files/[...]` | Serve library assets |

---

## 7. UI

- **Library home:** `/ops/content-creator` — browse, curate, variations, export
- **New credential:** `/ops/content-creator/create` — generate and export
- **Open prior work:** `/ops/content-creator?runId={id}` loads fields + previews when vnext run exists

---

## 8. Recommendations (Future)

1. Retention policy for `creative_lab/vnext/` after library sync (e.g. 30-day prune)
2. Re-export from library PNGs when vnext session is gone
3. Postgres index mirror if ops needs cross-machine catalog
4. Version history instead of overwrite on regen
