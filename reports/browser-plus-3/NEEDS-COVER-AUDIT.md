# Browser Plus 3.1 — Needs Cover Queue Audit

**Date:** 2026-06-24  
**Scope:** Audit only — no code changes  
**Question:** Why does Needs Cover appear incorrect, and what does the rule actually check?

---

## Executive Summary

**Needs Cover is not checking “any usable cover.”** It checks only whether a **song research package JSON** contains `metadata.coverUrl`.

It **does not** read:

- Retroverse Cover Library / canonical album artwork (Postgres)
- VDJ embedded cover tags
- VDJ sidecar thumbnails (`.jpg` next to `.mp4`)
- Album artwork unless copied into the package file

Result: **7,705 of 8,476** identified active videos are flagged Needs Cover, while **8,459** have at least one usable cover from some source. Under an “any source” rule, Needs Cover would be **17**.

The field name `hasRetroverseCover` is misleading — it means **package JSON cover URL**, not canonical Retroverse cover.

---

## 1. What fields are checked?

### Needs Cover decision (Browser Plus 3.1)

Source: `lib/ops/browser-plus-2/work-queues.ts`

```typescript
const hasRetroverseCover = row.hasRetroverseCover || Boolean(hint?.hasCover);
const needsCover = Boolean(row.rvtr && !hasRetroverseCover);
```

| Field | Used for Needs Cover? | Meaning |
|---|---|---|
| `row.rvtr` | **Gate** — must exist | RVTR parsed from VDJ Label |
| `row.hasRetroverseCover` | **Yes** | `Boolean(songPackage.metadata.coverUrl)` |
| `hint?.hasCover` | **Yes** (duplicate) | Same: `Boolean(pkg.metadata.coverUrl)` from package hints |
| `row.hasCover` | **No** | VDJ embedded cover **or** package cover |
| `row.coverStatus` | **No** | Derived from `hasCover` |
| `row.thumbnailStatus` / `thumbnailUrl` | **No** | Sidecar JPG/PNG next to video file |
| `row.retroverseCoverUrl` | **Indirectly** | Same value as package `coverUrl` (not Cover Library) |
| Canonical cover (Postgres) | **No** | Never queried by Browser Plus loader |

### Experience Ready (for context)

Also requires `hasRetroverseCover` (package URL) + research file + story + renderable status — same narrow cover definition.

### Research score cover bucket (for context)

Uses `row.hasRetroverseCover || pkg.metadata.coverUrl` — same narrow definition.

---

## 2. What tables/files are checked?

| Source | Path / table | Read by Needs Cover? |
|---|---|---|
| VirtualDJ database XML | VDJ `database.xml` (local path from env) | **Only** for RVTR label + VDJ cover tag (cover tag **not** used in queue) |
| Song research package | `{RETROVERSE_DATA}/ops/intelligence/song-packages/RVTR######.json` | **Yes** — `metadata.coverUrl` only |
| Package hints loader | Same `song-packages/*.json` directory | **Yes** — redundant `hasCover` flag |
| VDJ sidecar thumbnail | Filesystem: `{video}.jpg` beside `.mp4` | **No** (loaded as `thumbnailStatus` only) |
| Retroverse Cover Library | Postgres: `canonical_track_display`, `albums`, `album_artwork_links` via `loadCoverInfoForRvtrs()` | **No** |
| Album canonical cover path | Postgres `albums.canonical_cover_path` | **No** (unless written into package JSON during `processSong`) |

**Loader chain:**

1. `load-browser-plus.ts` parses VDJ XML → sets `hasRetroverseCover = Boolean(pkg?.coverUrl)` from package summaries  
2. `load-package-hints.ts` reads same JSON files → `hasCover: Boolean(pkg.metadata.coverUrl)`  
3. `work-queues.ts` combines those two booleans — **not** canonical DB, **not** thumbnails

---

## 3. Is it checking Retroverse canonical / package / VDJ / album?

| Cover type | Checked for Needs Cover? |
|---|---|
| Retroverse canonical cover (Cover Library / Postgres) | **No** |
| Song research package cover (`metadata.coverUrl`) | **Yes — only this** |
| VDJ embedded cover (`Infos Cover` / Link Cover in XML) | **No** |
| VDJ sidecar thumbnail (`.jpg`) | **No** |
| Album artwork (canonical graph) | **No** (unless already copied into package JSON) |

**Answer:** Package cover URL only — despite UI label “No Retroverse cover.”

---

## 4. Example trace: *NSYNC — Bye Bye Bye

### RVTR756100 (as specified)

| Check | Result |
|---|---|
| Row in Browser Plus active videos | **Not found** (0 rows in library) |
| Song package `RVTR756100.json` | **Does not exist** |
| Canonical cover (`loadCoverInfoForRvtrs`) | `coverUrl: null` |

**RVTR756100 is not a VDJ library row.** It may exist elsewhere in the canonical graph but is not loaded into Browser Plus. Cannot reproduce Needs Cover for this RVTR in the current UI dataset.

### Likely intended row: **RVTR565100** (active VIDEO)

User may have misread **565** as **756**. This is the active Bye Bye Bye video in `/DJ MEDIA/VIDEO/2000's/`.

| Step | Value |
|---|---|
| RVTR (Label) | `RVTR565100` |
| Package file | **Missing** — no `RVTR565100.json` |
| `metadata.coverUrl` | **null** (no package) |
| `row.hasRetroverseCover` | **false** |
| `hint?.hasCover` | **false** (no hint) |
| **`needsCover`** | **true** ← queue fires here |
| `row.hasCover` | **true** (VDJ embedded cover in XML) |
| `coverStatus` | **Cover Present** |
| `thumbnailStatus` | **Present** |
| Sidecar file | `'NSYNC - Bye Bye Bye.jpg` |
| Canonical Cover Library | **null** (no album link resolved for this RVTR in Postgres) |
| Also flagged | **Needs Research** (no package) |

**Decision path:**

```
rvtr = RVTR565100 ✓
hasRetroverseCover = false || false = false
needsCover = true && !false = TRUE
```

**Why it feels wrong:** Inspector shows cover image from `thumbnailUrl` / sidecar JPG and `coverStatus: Cover Present`, but Needs Cover ignores both because neither writes `metadata.coverUrl` on a research package.

**Work Queue panel “Has cover?”** uses `selectedRow.hasRetroverseCover` — also **No**, inconsistent with visible thumbnail.

---

## 5. Counts (active VIDEO rows with RVTR)

Dataset snapshot from live loader run (2026-06-24):

| Metric | Count |
|---|---|
| Active videos | **8,878** |
| With RVTR | **8,476** |
| **Needs Cover (current rule)** | **7,705** |

### Cover source availability (RVTR active videos)

| Source | Songs with this source |
|---|---|
| Song package `metadata.coverUrl` | **771** |
| Retroverse canonical cover (Postgres Cover Library) | **4,031** |
| VDJ sidecar thumbnail (`thumbnailStatus = Present`) | **8,261** |
| VDJ embedded cover without package URL | **7,677** |
| **Any cover source** (package OR canonical OR thumbnail OR VDJ cover) | **8,459** |

### False-positive signal (among current Needs Cover = 7,705)

| Still flagged Needs Cover but has… | Count |
|---|---|
| VDJ `coverStatus: Cover Present` | **7,677** |
| VDJ sidecar thumbnail | **7,517** |
| Retroverse canonical cover in Postgres | **3,262** |
| Package `coverUrl` | **0** (by definition) |

---

## 6. Alternative rule: “No usable cover from any source”

Proposed rule for comparison:

```
needsCover = rvtr && !(packageCoverUrl || canonicalCoverUrl || vdjThumbnail || vdjEmbeddedCover)
```

| Metric | Current rule | Any-source rule |
|---|---|---|
| Needs Cover | **7,705** | **17** |
| Delta | — | **−7,688** |

The current queue is overwhelmingly “**no research package cover URL**,” not “**no cover anywhere**.”

---

## Root Cause

1. **Misnamed field:** `hasRetroverseCover` = package JSON URL, not Cover Library.  
2. **Narrow queue rule:** Ignores thumbnails and VDJ covers that the inspector already displays.  
3. **Duplicate hint:** `hint?.hasCover` adds nothing — same source as `row.hasRetroverseCover`.  
4. **Canonical graph disconnected:** 3,262 songs with Postgres cover art still show Needs Cover.  
5. **Spec vs implementation:** Phase 3.1 spec said “No Retroverse cover assigned” but implementation equates that to missing package JSON field, not `loadCoverInfoForRvtrs()`.

---

## Recommendations (design only — not implemented)

Pick one cover truth for the queue:

| Option | Rule |
|---|---|
| A | **Package cover URL** — rename UI to “Needs Package Cover” |
| B | **Canonical Cover Library** — wire `loadCoverInfoForRvtrs()` into loader |
| C | **Any usable cover** — package OR canonical OR VDJ thumbnail OR embedded |
| D | **Experience-aligned** — same cover logic as Song Experience render path |

Until then, Needs Cover will stay ~91% of identified videos (7705/8476) regardless of visible artwork.

---

## Acceptance test mapping (RVTR565100)

| Question | Answer in UI today |
|---|---|
| Does it have an identity? | Yes — RVTR565100 |
| Does it have research? | No — Needs Research |
| Does it need review? | No |
| Does it have a cover? | **Panel says No** — but thumbnail + Cover Present say Yes |
| Is it experience ready? | No |
| What automation next? | Queue Ollama research build (Needs Research wins over Needs Cover) |

---

*End of audit.*
