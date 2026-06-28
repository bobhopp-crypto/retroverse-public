# Sprint 3.29 — Introduce the Retrograph

**Date:** 2026-06-28  
**Scope:** Architectural refactor and terminology cleanup — no UI redesign, no new collectors, no new experiences.

---

## Retrograph Definition

A **Retrograph** is the complete, ever-growing connected knowledge model for a Retroverse entity.

It preserves verified and pending facts, confidence scores, relationships, media, source provenance, raw evidence, normalized values, AI enrichments (placeholder), and editor refinement reports.

**Rules:**

- The Retrograph is never reduced for presentation.
- Experiences are generated **from** the Retrograph.
- The Retrograph is never generated from experiences.
- Only **Collector** and **Editor** modify the Retrograph.
- **Director** and **Publisher** read it only.

---

## Lifecycle

```
Collector  →  expands Retrograph
     ↓
Editor     →  refines Retrograph
     ↓
Director   →  reads Retrograph → experience inventory
     ↓
Publisher  →  publishes experiences (no knowledge edits)
```

---

## Department Responsibilities (Updated)

| Department | Retrograph role |
|------------|-----------------|
| **Collector** | Expand — append facts, sources, media, relationships; never delete |
| **Editor** | Refine — normalize, dedupe, score, resolve conflicts; never reduce for display |
| **Director** | Read — design experiences from full Retrograph |
| **Publisher** | Read — publish valid experiences; presentation profiles gate display later |

Kernel contracts updated in `lib/studio/contract.ts`.

---

## Relationship Model

First-class graph edges in `Retrograph.relationships[]`:

- `song_artist` · `song_album` · `song_chart_history` · `song_timeline_event`
- `song_performance` · `performance_video_file` · `performance_media`
- `song_related_song` · `artist_related`

Built automatically by `buildRetrographRelationships()` on each save.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/ops/studio/retrograph/types.ts` | Retrograph schema |
| `lib/ops/studio/retrograph/build-retrograph.ts` | Collector/Editor builder |
| `lib/ops/studio/retrograph/relationships.ts` | Edge derivation |
| `lib/ops/studio/retrograph/store.ts` | load/save |
| `lib/ops/studio/retrograph/migrate-legacy-dossier.ts` | dossier.json → Retrograph upgrade |
| `lib/ops/studio/retrograph/fact-guards.ts` | Invalid-fact guards |
| `lib/ops/studio/retrograph/index.ts` | Public barrel |
| `lib/ops/studio/director/retrograph-experience-plan.ts` | Canonical Director plan export |
| `lib/retroverse/renderer/retrograph-mobile-experience.ts` | Canonical Publisher compose export |
| `docs/studio/RETROGRAPH.md` | Architecture reference |

## Files Modified

| File | Change |
|------|--------|
| `lib/studio/package.ts` | `retrograph.json` path, `retrograph` artifact kind |
| `lib/studio/contract.ts` | Department missions + retrograph I/O |
| `docs/studio/STUDIO_BRAIN.md` | Retrograph in reading order, departments, decisions |
| `lib/ops/studio/dossier/*` | Thin `@deprecated` re-exports → retrograph |
| `lib/ops/studio/editor/*` | save/load Retrograph |
| `lib/ops/studio/director/*` | Read Retrograph; plan version `retrograph-3.29` |
| `lib/ops/studio/production/run-song.ts` | Retrograph save on production pass |
| `lib/retroverse/renderer/*` | Retrograph compose path |

---

## Migration Status

| Item | Status |
|------|--------|
| Primary artifact | `retrograph.json` |
| Legacy mirror | `dossier.json` still written on save |
| Load path | `retrograph.json` → fallback `dossier.json` (in-memory migrate) |
| `{RVTR}.retrograph.json` | Path reserved, not yet primary |
| Type aliases | `RetroverseDossier`, `DossierFact`, etc. → `@deprecated` aliases |
| Director template version | `retrograph-3.29` (accepts `dossier-3.27`) |
| Narrative purpose prefix | `retrograph:*` (existing `dossier:*` specs still load) |
| On-disk RVTR001341 | Still `dossier.json` until next Editor/Collector pass writes `retrograph.json` |

---

## Remaining Legacy Terminology

| Term | Location | Notes |
|------|----------|-------|
| `dossier/` module path | `lib/ops/studio/dossier/` | Shim re-exports — remove in future sprint |
| `dossier.json` | On disk | Legacy mirror — deprecate after full migration |
| `dossier-experience-plan.ts` | Director | Implementation file; exports `buildRetrographExperiencePlan` |
| `dossier-mobile-experience.ts` | Renderer | Implementation file; exports `composeRetrographMobileExperience` |
| `director-handoff.json` | Editor output | **Not** replaced — handoff is a Director contract, not the knowledge model |
| Cover backfill `dossier-path.ts` | `lib/covers/backfill/` | Unrelated cover dossier — out of scope |
| `SongPackage` / intelligence pipeline | Legacy Research | Separate system — not Retrograph |

---

## Behavior Changes

**None** for patron-facing experiences. Same pipeline flow; knowledge artifact renamed and structured. Existing `dossier.json` files continue to load. Next Editor/Collector pass writes both `retrograph.json` and `dossier.json`.

---

## Verification

```bash
npx tsc --noEmit   # Pass
```

Runtime regeneration not required for this sprint (architecture-only).

---

## Execution State

**COMPLETE**
