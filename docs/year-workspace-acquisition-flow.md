# Year Workspace — Acquisition Flow (Phase 4)

Ops-only production desk for building a year experience (e.g. `/ops/year/1967`). Architecture is **year-scoped**, not hardcoded to 1967 — curated recommendation pools register per year under `recommendations/providers/{year}/`.

## Flow

```
Recommendation (Wanted)
    → Find Sources
    → Source candidates (YouTube + Internet Archive search links)
    → Select / Reject
    → Acquisition Queue (Queued)
    → Asset Attached (drop zone metadata)
    → Acquired
    → Approved
```

Songs tab is unchanged: Billboard reconciliation (In Both / Chart Only / Review) with optional drop-zone metadata only.

Legacy shortcuts on Wanted recommendations remain: **Acquire**, **Skip**, **Approve** — no removal in Phase 4.

## Storage layout

All under `RETROVERSE_DATA/ops/year-workspace/{year}/`:

| Path | Purpose |
|------|---------|
| `{year}.json` (parent dir) | Song keywords + chart actions (legacy) |
| `albums.json`, `commercials.json`, … | Production items by section |
| `sources/{category}.json` | Source discovery candidates per recommendation |
| `incoming/{category}/` | Logical path prefix for attached filenames (no file move yet) |

### Production item (`kind`)

- `recommendation` — curated planning row in Wanted (and may sync to Acquired/Approved)
- `queue_entry` — selected source awaiting asset / acquire
- `asset` — unassigned drop metadata in Wanted

### Source candidate

```json
{
  "id": "src-…",
  "recommendationId": "rec-1967-commercials-…",
  "title": "1967 American Airlines Commercial",
  "sourceType": "youtube | internet_archive",
  "query": "1967 American Airlines …",
  "url": "https://…",
  "status": "pending | reviewed | selected | rejected"
}
```

## API (`PATCH /api/ops/year-workspace`)

| `op` | Description |
|------|-------------|
| `findSources` | `recommendationId` — generate/load candidates, returns `sourceDrawer` |
| `selectSource` | `recommendationId`, `sourceId` — queue entry + mark source selected |
| `rejectSource` | `recommendationId`, `sourceId` — mark rejected |
| `addAssets` | `filenames`, optional `queueItemId` — attach to queue or Wanted |
| `itemAction` | existing Acquire / Skip / Approve |
| `generateRecommendations` / `generateMoreRecommendations` | unchanged |

`GET` adds `showReadiness`: `{ percent, targetAssets, approvedAssets }` where  
`percent = round(approved / target × 100)` across all categories.

## UI

- **Workspace Summary** — W / Q / Aq / Ap per category + **Show Readiness %**
- **Find Sources** — Wanted recommendations (non-songs categories)
- **Source drawer** — YouTube + Internet Archive groups, Select / Reject
- **Acquisition Queue** — new section between Wanted and Acquired
- **Drop zone** — optional “Attach to queue item” selector; shows **Asset Attached ✓**

## New files (Phase 4)

### Core / paths

- `lib/ops/year-workspace/paths.ts`
- `lib/ops/year-workspace/show-readiness.ts`
- `lib/ops/year-workspace/acquisition-queue.ts`

### Source discovery

- `lib/ops/year-workspace/source-discovery/types.ts`
- `lib/ops/year-workspace/source-discovery/generate-candidates.ts`
- `lib/ops/year-workspace/source-discovery/source-state.ts`
- `lib/ops/year-workspace/source-discovery/to-production-item.ts` *(if split; queue uses acquisition-queue)*

### UI

- `components/ops/year-workspace/YearWorkspaceSourceDrawer.tsx`

### Docs

- `docs/year-workspace-acquisition-flow.md` (this file)

### Modified (representative)

- `lib/ops/year-workspace/production-types.ts` — `queued` section, queue fields
- `lib/ops/year-workspace/production-state.ts` — persistence, attach routing
- `lib/ops/year-workspace/production-utils.ts` — queued counts
- `lib/ops/year-workspace/load-production-bundle.ts` — show readiness in bundle
- `app/api/ops/year-workspace/route.ts` — source + queue ops
- `components/ops/OpsYearWorkspace.tsx`
- `components/ops/year-workspace/YearWorkspaceProductionTab.tsx`
- `components/ops/year-workspace/YearWorkspaceSummary.tsx`
- `components/ops/year-workspace/YearWorkspaceDropZone.tsx`
- `app/ops/ops.css`

## Adding a new year

1. Add `lib/ops/year-workspace/recommendations/providers/{year}/` with category arrays.
2. Register in `recommendations/providers/index.ts` → `BY_YEAR[year]`.
3. Open `/ops/year/{year}` — sources generate from title + year; no code changes required in UI/API.

## Not in scope (Phase 4)

- No deployment
- No file download or filesystem moves
- No web crawling (URLs are constructed search links only)
- Songs source discovery (recommendations remain chart-driven)
