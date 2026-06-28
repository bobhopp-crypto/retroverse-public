# Retrograph — Studio Knowledge Model

**Sprint 3.29** — permanent internal architecture for Retroverse entity knowledge.

The **Retrograph** is the complete, ever-growing connected knowledge model for a Retroverse entity (RVTR today; Artist, Album, Event, Venue, Year later).

Experiences are generated **from** the Retrograph. The Retrograph is never generated from experiences.

---

## Definition

A Retrograph preserves:

- Verified facts
- Pending facts
- Confidence scores
- Relationships (graph edges)
- Media (images, video references)
- Source provenance and raw excerpts
- Normalized entity fields
- AI enrichments (future)
- Editor refinement reports (dedupe, conflicts)
- Unknown / missing areas

The Retrograph is **never reduced for presentation**. Presentation profiles (Mobile, Museum, Live DJ, etc.) filter at publish time — not in the knowledge layer.

---

## Lifecycle

```
Collector  →  expands Retrograph
     ↓
Editor     →  refines Retrograph (normalize, dedupe, score — no deletion of useful facts)
     ↓
Director   →  reads Retrograph → creates experience inventory
     ↓
Publisher  →  publishes experiences (does not edit Retrograph)
```

---

## Department Rules

| Department | Retrograph access |
|------------|-------------------|
| **Collector** | **Write** — append facts, sources, media, relationships |
| **Editor** | **Write** — refine, merge duplicates, score confidence, flag conflicts |
| **Director** | **Read only** — "What experiences can be created from this Retrograph?" |
| **Publisher** | **Read only** — publish valid experiences |
| **Archive** | Stores `retrograph.json` on disk |

Only Collector and Editor modify the Retrograph.

---

## On-Disk Layout

| File | Purpose |
|------|---------|
| `retrograph.json` | **Canonical** Retrograph artifact |
| `dossier.json` | Legacy flat mirror (backward compatibility — still written) |
| `{RVTR}.retrograph.json` | Reserved incremental migration filename |

Path: `data/ops/intelligence/research-department/{RVTR}/retrograph.json`

Kernel helper: `retrographOutputPath(rvtr)` in `lib/studio/package.ts`.

---

## Module Location

```
lib/ops/studio/retrograph/
  types.ts              — Retrograph schema + relationship edges
  build-retrograph.ts   — Collector/Editor → Retrograph builder
  relationships.ts      — Graph edge derivation
  store.ts              — load/save with legacy dossier fallback
  migrate-legacy-dossier.ts
  fact-guards.ts        — invalid/corrupt fact detection (not rank-based)
  index.ts              — public barrel
```

Legacy shim: `lib/ops/studio/dossier/*` re-exports from `retrograph/` (`@deprecated`).

---

## Structure (v1)

```
Retrograph
├── entity          — id, kind, rvtr, generatedAt
├── song            — identity fields
├── artist          — name, related artists
├── album           — title, recordings[]
├── performances[]
├── charts
├── timeline[]
├── recording       — location, notes
├── personnel       — writers, producers, members
├── media           — images[], videos[]
├── relationships[] — graph edges (song→artist, song→album, etc.)
├── sources[]       — provenance + excerpts
├── facts[]         — verified (accepted)
├── pendingFacts[]
├── unknowns[]      — missing areas
├── aiEnrichments[] — future AI passes
└── confidence      — domain scores + dedupe/conflict reports
```

---

## Relationship Model

Relationships are first-class edges, not isolated facts:

| Edge kind | From → To |
|-----------|-----------|
| `song_artist` | Song → Artist |
| `song_album` | Song → Album |
| `song_chart_history` | Song → Chart |
| `song_timeline_event` | Song → Timeline event |
| `song_performance` | Song → Performance |
| `performance_video_file` | Performance → Media file |
| `performance_media` | Performance → Extracted frame |
| `song_related_song` | Song → Related song |
| `artist_related` | Artist → Artist |

Built by `buildRetrographRelationships()` after each Collector/Editor save.

---

## Migration Status (Sprint 3.29)

| Item | Status |
|------|--------|
| `retrograph.json` primary artifact | **Introduced** |
| `dossier.json` legacy mirror | **Still written** on save |
| Load fallback from `dossier.json` | **Supported** |
| Type rename `RetroverseDossier` → `Retrograph` | **Alias preserved** |
| Director plan version | `retrograph-3.29` (accepts `dossier-3.27`) |
| Narrative purpose prefix | `retrograph:*` (accepts `dossier:*` in existing specs) |

---

## Obsolete Terminology

Do not use in new Studio code or docs:

- dossier (use Retrograph)
- canonical dataset
- cleaned package
- editor handoff model (handoff is a Director *interface*, not the knowledge model)

`director-handoff.json` remains the Editor → Director **contract** for story prose and approved selections. The Retrograph is the **knowledge base** Director reads alongside that handoff.

---

## Related Docs

- `docs/studio/STUDIO_BRAIN.md` — Studio kernel and departments
- `lib/studio/contract.ts` — department I/O contracts (includes `retrograph` artifact kind)
- `reports/sprint-3.29-retrograph-architecture.md` — sprint deliverable
