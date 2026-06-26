# Browser Plus 3.1 — Needs Research Queue Audit

**Date:** 2026-06-24  
**Scope:** Audit only — no code changes  
**Dataset:** Live loader snapshot (8,878 active VIDEO rows)

---

## Executive Summary

**Browser Plus "Needs Research" does not mean missing knowledge. It means missing a song research package JSON file.**

Current rule:

```
needsResearch = RVTR exists AND packageStatus === "Missing Package"
```

That produces **7,212** rows — exactly **8,476 identified videos − 1,264 with package files**.

The queue is ~85% of all RVTR-assigned active videos and tracks the old **Identified** count almost one-for-one. It ignores chart history, canonical artist/album data, cover assignments, and other graph knowledge already in Postgres.

**Ollama should not process 7,212 songs.** A tighter queue based on missing enrichment is **~2,475** (Definition C) or human-prioritized subsets.

---

## 1. Current Queue Logic

### Needs Research

| | |
|---|---|
| **Source file** | `lib/ops/browser-plus-2/work-queues.ts` |
| **Function** | `computeWorkQueues()` |
| **Decision rule** | `needsResearch = Boolean(rvtr && !hasResearch)` where `hasResearch = row.packageStatus !== "Missing Package"` |
| **Data source** | `lib/ops/browser-plus/load-browser-plus.ts` → `loadPackageSummaries()` reads `{RETROVERSE_DATA}/ops/intelligence/packages/RVTR######.json` |
| **Display string** | `prettyStatus(null)` → `"Missing Package"` when no JSON file exists |

**Loader chain:**

1. VDJ XML parsed → RVTR from Label field  
2. `loadPackageSummaries()` builds map of package files on disk  
3. `packageStatus = prettyStatus(pkg?.status)` → `"Missing Package"` if no file  
4. `loadBp2PackageHints()` reads same files (adds fact/story counts — **not** used for Needs Research gate)  
5. `computeWorkQueues()` checks only `packageStatus !== "Missing Package"`

**What is NOT consulted:** Postgres canonical graph, chart appearances, cover library, VDJ metadata, Wikipedia, fact/story content outside package file.

---

### Needs Review

| | |
|---|---|
| **Source file** | `lib/ops/browser-plus-2/work-queues.ts` |
| **Function** | `computeWorkQueues()` |
| **Decision rule** | `needsReview = Boolean(rvtr && researchStatus === "review")` |
| **Data source** | `hint.status` from `loadBp2PackageHints()` → `pkg.status` in package JSON |
| **Count** | **936** — all have `researchPackageStatus === "review"` |

Disjoint from Needs Research (requires package file to exist).

---

### Experience Ready

| | |
|---|---|
| **Source file** | `lib/ops/browser-plus-2/work-queues.ts` |
| **Function** | `computeWorkQueues()` |
| **Decision rule** | All must be true: |
| | • `rvtr` exists |
| | • `hasResearch` (package JSON exists) |
| | • `hasRetroverseCover` (= `metadata.coverUrl` in package JSON only) |
| | • `storyCount > 0` (from package hints) |
| | • `hint.experienceReady` (= package `status` is `review` or `published`) |
| **Renderability source** | `lib/ops/intelligence/song-experience-renderability.ts` |
| **Count** | **611** |

---

## 2. What Counts As Research?

Browser Plus 3.1 equates **research = song package JSON file exists**. Nothing else satisfies `hasResearch`.

| Artifact | Storage location | Approx. count (scope) | BP counts as "research"? |
|---|---|---|---|
| **Song package JSON** | `RETROVERSE_DATA/ops/intelligence/packages/RVTR######.json` | 1,351 files global; **1,264** matched to active VIDEO RVTRs | **Yes — only this** |
| Package status field | Inside package JSON (`draft`, `review`, `published`, etc.) | See status breakdown below | Indirectly (drives Needs Review / Experience Ready) |
| **Research Vault sources** | `package.researchVault[]` in JSON | 7,245 source entries across all packages; **1,264** videos have ≥1 source | **No** (only counts toward story/score if package exists) |
| **Candidate facts** | `package.candidateFacts[]` | ~15,716 facts across packages; **1,148** active VIDEO RVTRs | **No** |
| **Candidate stories** | `package.candidateStories[]` | ~7,212 stories across packages; **1,148** active VIDEO RVTRs | **No** (story count used for Experience Ready only) |
| **Story cards** | `package.storyCards[]` | ~2,273 cards global; **345** active VIDEO RVTRs | **No** |
| **Package intel — chart history** | `package.intel.chartHistory[]` | **850** active VIDEO RVTRs | **No** |
| **Package intel — timeline** | `package.intel.timelineEvents[]` | **1,094** active VIDEO RVTRs (≥2 events) | **No** |
| **Chart history (Billboard)** | Postgres: `chart_appearances` + `canonical_tracks` | 32,187 RVTRs globally; **4,967** active VIDEO RVTRs | **No** |
| **Chart peak/weeks** | Postgres: `canonical_track_display` | **4,967+** with chart signals | **No** |
| **Artist information** | Postgres: `canonical_track_display.canonical_artist_name` | 49,187 RVTR tracks in display; **8,476/8,476** active VIDEO RVTRs | **No** |
| **Album relationships** | Postgres: `canonical_album_tracks` + `albums` | 16,727 RVTRs globally; **4,390** active VIDEO RVTRs | **No** |
| **Cover assignments** | Postgres Cover Library via `loadCoverInfoForRvtrs()` | **4,034** active VIDEO RVTRs | **No** (see Needs Cover audit) |
| **Package cover URL** | `package.metadata.coverUrl` | **771** active VIDEO RVTRs | **No** (only used for cover queue / Experience Ready) |
| **VDJ thumbnail** | Filesystem sidecar `.jpg` | ~8,261 active VIDEO RVTRs | **No** |
| **Wikipedia discoveries** | Captured into `researchVault[]` during `processSong()` | Inside package JSON only | **No** unless package file exists |
| **Song Experience renderability** | Derived from package `status` | 611 ready | **Output**, not input to Needs Research |

**Conclusion:** Retroverse stores extensive knowledge outside package files. Browser Plus treats all of it as invisible until Ollama writes a JSON file.

---

## 3. Quantify Existing Knowledge

**Scope:** Active VIDEO library rows with RVTR (**8,476** songs)

| Knowledge type | Songs with this data |
|---|---|
| Package JSON file | **1,264** |
| Chart history (Postgres) | **4,967** |
| Chart history (package intel) | **850** |
| Cover assignment (Cover Library) | **4,034** |
| Cover URL in package JSON | **771** |
| Artist info (canonical) | **8,476** |
| Album info (canonical) | **4,390** |
| Timeline (package intel, ≥2 events) | **1,094** |
| Fact records (package) | **1,148** |
| Story records (package) | **1,148** |
| Research Vault sources (package) | **1,264** (all package files include vault entries) |
| Story cards (package) | **345** |

### Package status breakdown (active VIDEO + RVTR)

| Status | Count |
|---|---|
| Missing Package | **7,212** |
| Needs Review (`review`) | **936** |
| Cards Ready | **136** |
| Draft | **116** |
| Published | **76** |
| **Total with package** | **1,264** |

Note: 1,351 package files exist on disk; **87** are for RVTRs not in the active VIDEO library.

---

## 4. Alternative Definitions

All counts scoped to **active VIDEO rows with RVTR (8,476)**.

| Definition | Rule | Count |
|---|---|---|
| **A — Current** | No package JSON file | **7,212** |
| **B** | No facts AND no stories AND no sources | **7,212** |
| **C** | No meaningful enrichment (no package, no canonical chart, no canonical cover, no album, no package content) | **2,475** |
| **D** | No chart AND no artist AND no album AND no facts AND no stories | **0** |

### Why A = B here

Every package file in the active VIDEO library contains at least one `researchVault` source (Ollama/deterministic pipeline always writes vault entries). No package file has empty facts + stories + sources. Definition B adds **zero** songs beyond Definition A.

### Why D = 0

All 8,476 active VIDEO RVTRs resolve to a `canonical_track_display` row with artist name. Definition D can never fire for identified videos.

### Needs Research "false positives" (current 7,212)

Songs flagged Needs Research that **already have** canonical knowledge:

| Already have | Count among Needs Research |
|---|---|
| Canonical chart history | **4,127** |
| Canonical artist name | **7,212** (all) |
| Canonical album link | **3,544** |

---

## 5. Experience Ready Audit

**Ready:** **611**  
**Not ready:** **7,865** (among all 8,878 active videos)  
**Missing RVTR (not in ready path):** **402** (Needs Identity)

### Non-exclusive failure counts (8,476 with RVTR, not Experience Ready)

Multiple failures overlap per song.

| Failure reason | Count |
|---|---|
| Missing package JSON | **7,212** |
| Missing package cover URL | **7,705** |
| Missing story (`storyCount === 0`) | **7,328** |
| Package exists but status not `review`/`published` | **252** |

### Exclusive waterfall (first blocking gate)

Simulates `experienceReady` checks in order:

| First failure | Count |
|---|---|
| No package | **7,212** |
| No package cover URL | **493** |
| No story | **76** |
| Not renderable status | **84** |
| **Experience Ready** | **611** |

**Reading:** 85% fail immediately on missing package file. Among the 1,264 with packages, most fail on missing `metadata.coverUrl` (493), then story (76), then status (84).

---

## 6. Operational Recommendation

### Should Ollama process 7,212 songs?

**No.** That number means "no JSON file," not "no research possible."

| Segment | Count | Recommended action |
|---|---|---|
| Already Experience Ready | **611** | None — maintain |
| Needs Review (package exists, status `review`) | **936** | **Human review** — not Ollama generation |
| Has package, other statuses | **328** | Targeted fixes (cards, publish, cover URL) |
| Needs Research, **with** canonical chart/album/cover | **~4,000+** | **Deterministic package bootstrap** from graph — not full Ollama scrape |
| Needs Research, **no** meaningful enrichment (Def C) | **2,475** | **Ollama / full `processSong()`** priority queue |
| Needs Identity | **402** | Matcher / RVTR assignment first |

### Recommended queue definitions

Replace implementation metrics with work that reflects actual gaps:

| Queue | Proposed rule | Approx. size |
|---|---|---|
| **Needs Identity** | No RVTR | **402** |
| **Needs Research Build** | RVTR + no package JSON + no canonical chart AND no album link | **~1,500–2,500** (tighter than 7,212) |
| **Needs Ollama Enrichment** | RVTR + no package + Def C (no graph enrichment) | **2,475** |
| **Needs Review** | Package status = `review` | **936** |
| **Needs Package Cover** | Package exists + no `metadata.coverUrl` | **~493** (not 7,705 — see Needs Cover audit) |
| **Needs Cover (any source)** | RVTR + no usable cover from any source | **~17** |
| **Experience Ready** | Current rule OR relaxed cover rule | **611** (or higher if cover fixed) |

### Priority order for automation

1. **Matcher** → 402 Needs Identity  
2. **Deterministic research bootstrap** → graph-rich songs without package (~4,700 of the 7,212)  
3. **Ollama `processSong()`** → 2,475 with no meaningful enrichment  
4. **Human review** → 936 in `review` status  
5. **Cover pipeline** → 493 with package but no cover URL  

### Key insight

The suspicious similarity between **Needs Research (7,212)** and historical **Identified (~8,476 − 402)** is **by design in code**, not coincidence:

```
Needs Research ≈ Identified − Has Package File
7212 ≈ 8476 − 1264 ✓
```

Browser Plus is queueing **file creation**, not **knowledge acquisition**.

---

## Appendix — Code References

```typescript
// work-queues.ts — entire research gate
const hasResearch = row.packageStatus !== "Missing Package";
const needsResearch = Boolean(row.rvtr && !hasResearch);
const needsReview = Boolean(row.rvtr && researchStatus === "review");
```

```typescript
// load-browser-plus.ts — packageStatus origin
const pkg = rvtr ? packages.get(rvtr) ?? null : null;
const packageStatus = prettyStatus(pkg?.status); // "Missing Package" if null
```

```typescript
// prettyStatus — no file → Missing Package
if (!status) return "Missing Package";
```

---

*End of audit.*
