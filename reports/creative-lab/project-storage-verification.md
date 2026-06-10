# Creative Lab Phase 4A — Project Storage + Asset Management

**Foundation:** `1938453` · **Prompt Renderer:** `f30cd13` · **Presets:** `962f463`  
**Verified:** 2026-06-09  
**Scope:** Project folders, asset model, library UI, final selection, exports. No image providers.

## Summary

| Check | Result |
|-------|--------|
| Workspace load | PASS |
| Slug-based project create | PASS |
| Concept A–D + placeholder assets | PASS |
| Asset library (4 cards) | PASS |
| Approve / Reject | PASS |
| Set Final Front | PASS |
| Save project | PASS |
| Export project package (ZIP) | PASS |
| Export finals | PASS |
| Reload persistence | PASS |
| Folder structure (6/6 subdirs) | PASS |

## Screenshots

| Artifact | File |
|----------|------|
| Project toolbar + Pass Lab | `reports/creative-lab/storage-pass-lab.png` |
| Asset library | `reports/creative-lab/storage-asset-library.png` |
| Final selection | `reports/creative-lab/storage-final-selection.png` |
| Reload persistence | `reports/creative-lab/storage-reload.png` |
| Toolbar | `reports/creative-lab/storage-toolbar.png` |

## Storage structure

```
RETROVERSE_DATA/creative_lab/projects/{folder-slug}/
├── project.json          # v2 — metadata, styles, prompts, assets, final slots
├── prompts/              # {promptId}.json + .txt
├── concepts/               # {variationSetId}.json (A–D sets)
├── generated/              # {assetId}.placeholder.json
├── selected/               # approved/final mirrors
├── exports/                # ZIP packages + finals/
└── notes/                  # README.txt
```

Example slug: `sunday-nights-june-15-2026`

Findings: `reports/creative-lab/project-storage-findings.txt`  
Structure probe: `reports/creative-lab/storage-structure.txt`

## Asset model (v2)

```json
{
  "id": "asset-…",
  "projectId": "sunday-nights-june-15-2026",
  "type": "pass-front",
  "concept": "A",
  "status": "generated | approved | rejected | final",
  "createdAt": "…",
  "filePath": "generated/asset-….placeholder.json",
  "notes": "Concept A — …",
  "promptId": "prompt-…",
  "module": "pass-lab",
  "strategyId": "broadcast-focus"
}
```

**Final slots** (one winner each): `final-front`, `final-back`, `final-poster`, `final-bumper`

## Toolbar actions

| Action | Behavior |
|--------|----------|
| Save Project | `persistProjectBundle` — JSON + prompts + concepts |
| Reveal Project Folder | macOS Finder via ops reveal API |
| Open Exports Folder | Opens `exports/` |
| Export Project Package | ZIP → `exports/{Project-Name}.zip` |
| Export Finals | Copies final deliverables → `exports/finals/` |

## Readiness for image generation

**Ready.** Provider integration can:

1. Write images to `generated/{assetId}.png`
2. Update asset `filePath` + `status: generated`
3. Reuse approve/reject/final workflow unchanged
4. Export finals picks `finalAssetSlots` winners only

**Not built:** image providers, PDF export, real PNG deliverables (placeholders only).

## Re-run verification

```bash
RETROVERSE_OPS=1 npm run dev
RETROVERSE_OPS=1 npx tsx tools/creative-lab/project-storage-capture.ts
```
