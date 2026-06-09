# Media Lab Unification Verification

**Date:** 2026-06-09  
**Status:** Verified (API layer)

## Checks

| Check | Result |
|-------|--------|
| Performance browse total | 2471 |
| Episode browse total | 149 |
| Exported clips | 1976 |
| Workspace href | `/ops/media-lab?library=performances` |
| Performance editor href | `/ops/media-lab?library=performances&collection=midnight_special&episode=6teeqCXCWq4&performance=6teeqCXCWq4%3Ach018` |
| Smokey search hits | 3 |
| Episode ID search hits | 3 |

## Episode sample

```json
{
  "title": "Ep 152 - The Midnight Special Episode |  January 9, 1976",
  "performances": 23,
  "accepted": 19,
  "review": 4
}
```

## Legacy redirect

`mode=clip_review` URLs redirect to unified workspace with `library=performances`.

`/ops/media-lab/performances` redirects to `/ops/media-lab?library=performances`.

## Screenshots

- `reports/media-lab/media-lab-workspace.png` — unified workspace
- `reports/media-lab/media-lab-workspace-editor.png` — performance selected
- `reports/media-lab/media-lab-workspace-episodes.png` — episode browser

## Verification checklist

- [x] Import workflow preserved (OpsMediaLab in main panel)
- [x] Performance browse API works
- [x] Episode browse API works
- [x] Exported clips API works
- [x] Legacy clip_review redirect
- [x] Legacy /performances redirect
- [x] Single editor (embedded clip review, not separate page mode)
- [x] No duplicate Performance Browser page UI

## Remaining gaps

1. **Collection import deep link** — `?year=&job=` still not auto-loading in OpsMediaLab
2. **Top of the Pops / Live Aid / Woodstock** — registry stubs only
3. **Editorial + performance editor** — two editors coexist (year jobs vs collection performances); unified shell but different data models
4. **MS exports Open Folder** — uses `reveal-path` limited to VDJ export dir
5. **Recent list** — localStorage only; not shared across browsers
