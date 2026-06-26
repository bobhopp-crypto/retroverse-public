# Studio Alpha Sprint A3 — Validation Summary

Song / Recording / Performance separation on three validation tracks.

| RVTR | Artist | Song yr | Recording yr | Perf yr | v4 |
|------|--------|---------|--------------|---------|-----|
| RVTR164626 | johnny cash | 1956 | 2012 | 1956 | 4 |
| RVTR417030 | phil collins | 1981 | 2016 | 1981 | 4 |
| RVTR935083 | Roger Waters & Sinead O'Connor | 1990 | — | 1980 | 4 |

## Deliverables

1. Collector package schema v4 — `lib/ops/studio/collector/types.ts`, `entity-model.ts`
2. Song entity — `songEntity` on package
3. Recording entity — `recordings[]` on package
4. Performance entity — `performanceEntities[]` + existing `performances[]`
5. Timeline model — `timelines.song/recording/performance`
6. Identity resolution — `lib/ops/studio/collector/identity-resolution.ts`
7–8. Per-song comparisons — `RVTR*-COMPARISON.md` in this folder
9. Editor receives unambiguous dates via `workspace.evidence.canonical`

## Director readiness

Director can **safely consume Collector v4** for presentation prototyping when:
- `yearResolution` is present and `conflicts` is empty or documented in `notes`
- Story angle selects which timeline is primary (`evidence.songTimeline` / `recordingTimeline` / `performanceTimeline`)
- Director must **not** read flat `identity.year` alone — use `songEntity.originalReleaseYear`, `recordings[].releaseDate`, and `performanceEntities[].performanceYear`

Remaining gaps: chart backfill for pre-Hot-100 heritage, Wikipedia enrichment when culture confidence is low.

