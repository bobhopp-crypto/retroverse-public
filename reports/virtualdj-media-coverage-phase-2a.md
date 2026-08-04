# VirtualDJ Media Coverage — Billboard Target Model

Date: 2026-07-29

Scope: BobOS read-only media-coverage assessment

Route: `/bobos/virtualdj-media-coverage`

## 1. Correction outcome

The earlier Phase 2A implementation made a VirtualDJ MyList the primary target. That was a product-direction error. The active workflow is now:

1. Select one Billboard Hot 100 week or one full chart year.
2. Parse and index the complete VirtualDJ `database.xml`.
3. Compare every Billboard target with the complete XML inventory.
4. Calculate independent Audio Readiness and Video Coverage.
5. Review ambiguous evidence and explicit operator decisions.
6. Open a resolved, video-missing song in the existing Phase 1 Video Acquisition workflow.

The source roles are now explicit:

- PostgreSQL `chart_appearances` defines the Billboard songs to assess.
- VirtualDJ `database.xml` defines the media Bob owns.
- VirtualDJ MyLists are an isolated future target adapter and are not required by the active product.

The previous `List.vdjfolder` scan is historical implementation evidence only. It is not a product acceptance result and was not investigated further.

## 2. Retained Phase 2A foundation

The correction reused the working shared infrastructure instead of restarting:

- read-only VirtualDJ XML parsing and fingerprinting;
- one full-library XML index per scan;
- managed MUSIC, managed VIDEO, VIDEO VAULT, and outside-library classification;
- RVTR, artist/title, title, artist, and filepath indexes;
- deterministic candidate matching and ambiguity evidence;
- version detection and compatibility rules;
- selective `ffprobe` audio inspection and cache;
- Audio Readiness classification;
- atomic, versioned JSON persistence;
- explicit operator decisions and history;
- safety checks and deterministic audio fixtures.

The shared XML parser was extended only as needed to expose duration, file size, extension, and managed-root classification.

## 3. Active Billboard target model

The visible target source is fixed to `Billboard Hot 100`. Version 1 supports:

- **One week:** year, month, and a valid chart date obtained from PostgreSQL.
- **Full year:** year.

The UI does not expose Billboard 200, Cash Box, Record World, UK or genre charts, custom collections, or MyLists.

For every target, the scan retains:

- chart source and selected date or year;
- rank and best rank;
- appearance count;
- first and last chart dates;
- graph track ID;
- canonical track ID when available;
- chart-authority RVTR when resolved;
- canonical title, artist, album, and year when available;
- unresolved identity state.

A full year is deduplicated by chart identity into one target per song. Weekly appearances remain as evidence, so a song present for 20 weeks is one assessment target with an appearance count of 20. Unresolved Billboard identities remain visible. The scanner never invents or assigns an RVTR.

## 4. Ownership authority and XML inventory

The ownership authority is always:

`/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml`

Only XML entries can establish ownership. A completed Phase 1 manifest does not count until the resulting file appears in XML under the managed VIDEO root.

The scanner builds one immutable in-memory index before resolving Billboard targets. The final live inventory was:

| Class | Entries |
|---|---:|
| XML entries | 32,790 |
| Managed MUSIC | 18,530 |
| Managed VIDEO | 8,896 |
| VIDEO VAULT excluded | 4,328 |
| Outside managed library | 1,036 |

Both `RVTR######` and `PK_RVTR######` labels are recognized without writing or inventing labels.

Managed-root rules are:

- `/Users/bobhopp/DJ MEDIA/MUSIC/` → managed audio
- `/Users/bobhopp/DJ MEDIA/VIDEO/` → managed production video
- `/Users/bobhopp/DJ MEDIA/VIDEO VAULT/` → excluded
- all other paths → outside managed library

VIDEO VAULT is checked before the broader VIDEO root. VIDEO VAULT and outside-managed entries may remain visible as evidence, but they cannot establish ready audio, ready video, chart matching success, or an acquisition handoff.

## 5. Billboard-to-XML matching

Every viable candidate is evaluated before a winner is selected. Evidence is ordered around:

1. exact chart-authority RVTR label;
2. approved structured canonical relationship;
3. exact normalized artist and title;
4. title-first lookup with artist confirmation;
5. artist-first lookup with title confirmation;
6. album and year support;
7. filename and filepath support;
8. version compatibility;
9. candidate confidence;
10. winner-to-runner-up ambiguity margin.

The scan persists every considered candidate, identity score components, version evidence, managed-root class, file-existence result, ambiguity margin, and review reason. Fuzzy matching never silently establishes ownership.

Visual validation exposed and corrected one concrete matching defect: a title-first or artist-first candidate could previously survive without confirmation from the reciprocal identity component. Both lookup paths now require that confirmation, and a regression fixture covers it.

## 6. Independent audio and video axes

Every Billboard target receives both results during the same scan.

Audio Readiness:

- `ready`
- `review`
- `upgrade_recommended`
- `alternate_only`
- `missing`

Video Coverage:

- `ready`
- `review`
- `alternate_only`
- `missing`

Audio and video remain independent:

- managed MUSIC never satisfies Video Coverage;
- managed VIDEO never automatically satisfies Audio Readiness;
- VIDEO VAULT satisfies neither;
- operator decisions are stored separately by axis.

Audio reuses the Phase 2A probe and classifier. Only viable managed-MUSIC candidates for selected targets are probed, and the cache key reflects path, mtime, and size. Bitrate alone never decides readiness or upgrade status.

Video can be ready only when an owned XML entry is inside managed VIDEO, outside VIDEO VAULT, exists locally, has exact or approved identity, and has compatible version evidence. Incompatible live, concert, television, remix, extended, acoustic, karaoke, cover, tribute, re-recording, instrumental, demo, or other alternate evidence cannot silently satisfy the canonical target.

## 7. UI and Phase 1 handoff

The active page now shows:

- Billboard Hot 100, set type, year, and valid week controls;
- full XML inventory and fingerprint time;
- 11 target, unresolved, audio, and video summary cards;
- all requested audio, video, combined-missing, and unresolved filters;
- `Rank | Song / Artist | Audio | Video | Chart weeks | Action`;
- a detail drawer with Billboard identity, all XML candidates, root classification, score components, version evidence, ambiguity, file existence, audio probe evidence, automatic reasons, separate decisions, and history.

MyList selection is absent from the active interface. Historical MyList routes and utilities remain isolated and do not influence Billboard targets, scan history, or decisions.

`Video Acquisition` is shown only when all of the following are true:

- the Billboard identity is resolved;
- the target has a chart-authority RVTR;
- effective Video Coverage is `missing`.

The handoff opens `/bobos/song-workspace` with RVTR plus source, date or year, rank or best rank, scan ID, coverage state, and a suggested official-video query. It does not search, approve, or download automatically. Phase 1 remains the only video execution workflow.

## 8. Persistence and decisions

Chart scans are stored beneath:

`{RETROVERSE_DATA}/virtualdj_media_coverage/`

Version 2 records include:

- product and target type;
- chart source, set type, year, and optional week;
- XML fingerprint and inventory;
- deduplicated Billboard targets;
- independent audio and video outcomes;
- all candidate and probe evidence;
- summaries;
- separate audio and video decisions and history;
- timestamps.

Writes are schema-validated and atomic. Historical Version 1 MyList records remain identifiable as `vdj_mylist`; active chart listing, resumption, and carry-forward operate only on chart records with the same selection key. Audio decisions never override video and vice versa. Changed evidence requires confirmation instead of silently carrying a decision forward as current.

## 9. Exact live Billboard week

The accepted live read-only week was Billboard Hot 100 for `1978-07-29`.

Scan ID: `coverage-20260729235611-f570c4b80a`

| Evidence | Result |
|---|---:|
| Chart rows loaded | 100 |
| Unique targets | 100 |
| Chart-authority RVTR resolved | 100 |
| Unresolved identities | 0 |
| Audio ready | 20 |
| Audio review | 3 |
| Audio upgrade recommended | 0 |
| Audio alternate only | 0 |
| Audio missing | 77 |
| Video ready | 37 |
| Video review | 3 |
| Video alternate only | 0 |
| Video missing | 60 |
| Audio decisions | 0 |
| Video decisions | 0 |

VIDEO VAULT contributed zero ready audio and zero ready video. Outside-managed entries contributed zero ready audio and zero ready video.

## 10. Representative full-year validation

Full-year mode was validated only after the week scan passed.

Selection: Billboard Hot 100, `1978`

Scan ID: `coverage-20260730000023-91b2d86961`

| Evidence | Result |
|---|---:|
| Weekly appearance rows loaded | 5,204 |
| Deduplicated target songs | 536 |
| Chart-authority RVTR resolved | 534 |
| Unresolved identities | 2 |
| Audio ready | 83 |
| Audio review | 19 |
| Audio upgrade recommended | 2 |
| Audio alternate only | 0 |
| Audio missing | 432 |
| Video ready | 113 |
| Video review | 14 |
| Video alternate only | 0 |
| Video missing | 409 |

The 5,204 weekly rows became 536 unique targets while retaining best rank, appearance count, and first/last dates. The 2 unresolved identities remained visible and exposed no Video Acquisition handoff. VIDEO VAULT and outside-managed paths again contributed zero ready results on both axes.

## 11. XML and media immutability

The same XML evidence was recorded before and after both accepted live scans:

| Evidence | Before | After |
|---|---|---|
| SHA-256 | `83b6094ea9dcb41532acda2378d62408610749dbbdcfd765433c9bb33e213ec0` | `83b6094ea9dcb41532acda2378d62408610749dbbdcfd765433c9bb33e213ec0` |
| mtime milliseconds | `1785351477611.119` | `1785351477611.119` |
| mtime ISO | `2026-07-29T18:57:57.611Z` | `2026-07-29T18:57:57.611Z` |
| Size | `39,385,011` bytes | `39,385,011` bytes |

The XML inventory fingerprint was:

`d700c031f683a56321abc8d9261505b1f95bd1d0d1ca2a72b888d7c6835d2883`

Hash, mtime, and size were unchanged. The sprint did not write XML, modify media, acquire audio, assign RVTR labels, invoke yt-dlp, or add a database migration or dependency.

## 12. Tests, build, and visual validation

Targeted TypeScript:

`npx tsc --noEmit -p tools/video-acquisition/tsconfig.phase2a.verify.json --pretty false`

Result: **PASS** for the shared services, target adapter, component, page, API routes, and validation tools.

Deterministic fixtures:

- **PASS — 18/18 preserved Audio Readiness fixtures**
- **PASS — 19/19 Billboard coverage fixtures**

The 19 Billboard cases cover the requested 18 scenarios plus the reciprocal title/artist-confirmation regression.

Studio production build:

- route duration guard passed;
- optimized compilation exhausted the Node heap at the default limit;
- retries at 8 GB and 12 GB also exhausted the heap;
- no source, route, or TypeScript error surfaced before heap exhaustion.

The whole-workspace optimized build is therefore **environmentally blocked, not passed**. It was not retried further. The known Studio development server was the only process stopped for the build attempts and was restored afterward.

Browser validation at 1440 × 900 passed:

- Billboard is the visible target; MyList is absent.
- Week and full-year controls work.
- Week and year summary totals match their saved scans.
- Both audio and video columns render.
- requested filters work.
- the evidence drawer is readable and usable.
- resolved/video-missing rows show Phase 1 handoff.
- ready-video and unresolved rows do not show handoff.
- no destructive control is present.
- document width was 1,425 px within a 1,440 px viewport, with no horizontal overflow.

## 13. Exact files changed

The complete proposed feature scope is:

```text
reports/virtualdj-media-coverage-phase-2a.md
packages/shared/lib/ops/intelligence/vdj-database.ts
packages/shared/lib/ops/virtualdj-media-coverage/atomic-json.ts
packages/shared/lib/ops/virtualdj-media-coverage/audio/audio-probe.ts
packages/shared/lib/ops/virtualdj-media-coverage/audio/classify-readiness.ts
packages/shared/lib/ops/virtualdj-media-coverage/chart-classification.ts
packages/shared/lib/ops/virtualdj-media-coverage/chart-scan.ts
packages/shared/lib/ops/virtualdj-media-coverage/chart-store.ts
packages/shared/lib/ops/virtualdj-media-coverage/index.ts
packages/shared/lib/ops/virtualdj-media-coverage/managed-roots.ts
packages/shared/lib/ops/virtualdj-media-coverage/match.ts
packages/shared/lib/ops/virtualdj-media-coverage/my-lists.ts
packages/shared/lib/ops/virtualdj-media-coverage/paths.ts
packages/shared/lib/ops/virtualdj-media-coverage/scan.ts
packages/shared/lib/ops/virtualdj-media-coverage/store.ts
packages/shared/lib/ops/virtualdj-media-coverage/structured-relationships.ts
packages/shared/lib/ops/virtualdj-media-coverage/targets/billboard-hot100.ts
packages/shared/lib/ops/virtualdj-media-coverage/types.ts
packages/shared/lib/ops/virtualdj-media-coverage/vdj-index.ts
packages/shared/lib/ops/virtualdj-media-coverage/version-evidence.ts
packages/shared/lib/ops/virtualdj-media-coverage/video/classify-coverage.ts
packages/shared/components/bobos/virtualdj-media-coverage/VirtualDjMediaCoverage.tsx
packages/shared/components/bobos/virtualdj-media-coverage/media-coverage.css
apps/studio/app/bobos/virtualdj-media-coverage/page.tsx
apps/studio/app/api/ops/virtualdj-media-coverage/_helpers.ts
apps/studio/app/api/ops/virtualdj-media-coverage/chart-options/route.ts
apps/studio/app/api/ops/virtualdj-media-coverage/my-lists/route.ts
apps/studio/app/api/ops/virtualdj-media-coverage/scans/route.ts
apps/studio/app/api/ops/virtualdj-media-coverage/scans/[scanId]/route.ts
apps/studio/app/api/ops/virtualdj-media-coverage/scans/[scanId]/decisions/route.ts
tools/video-acquisition/phase2a-audio-readiness-self-test.ts
tools/video-acquisition/phase2a-billboard-coverage-self-test.ts
tools/video-acquisition/phase2a-live-billboard-readonly-scan.ts
tools/video-acquisition/tsconfig.phase2a.verify.json
```

Relative to `HEAD`, the isolated scope is 34 files: 1 tracked file with edits and 33 new feature files, totaling 4,766 added lines and 4 deleted lines.

No public-site, Broadcast Mixer, media, XML, migration, or dependency file is included.

## 14. Exact proposed staging list

Nothing is staged, committed, or pushed. The exact proposed staging list is the 34-file block in Section 13, in that order.

The proposed list deliberately excludes unrelated dirty work, the superseded MyList-first architecture plan, the historical MyList-only live scanner, and all Phase 1 acquisition files:

- `reports/video-acquisition-phase-2-chart-coverage-plan.md`
- `tools/video-acquisition/phase2a-live-readonly-scan.ts`
- every unrelated path shown by the working tree

The preserved MyList adapter files are included only as isolated future infrastructure. They are not imported or called by the active UI and do not affect chart scan history or decisions.

## 15. Remaining gaps

- The whole Studio optimized production build still needs an environment with enough available Node heap; three increasingly large heap limits all exhausted memory.
- The two unresolved 1978 chart identities require upstream chart/canonical identity work. The scanner intentionally leaves them visible and does not invent RVTR values.
- `database.xml` contains two malformed nested duplicate `<Song>` tokens. The parser indexes the 32,790 top-level records and does not attempt library repair.
- Audio `review` results still require operator listening and judgment.
- No chart source beyond Billboard Hot 100 is exposed in Version 1 by design.
- No audio acquisition, automated video search, approval, download, media replacement, retagging, or XML mutation is implemented.

## 16. Definition of done

- [x] Billboard Hot 100 is the active visible selector.
- [x] MyList is not required.
- [x] Complete `database.xml` is indexed once per scan.
- [x] One real 100-row Hot 100 week was compared with the XML.
- [x] Every selected chart song receives independent audio and video status.
- [x] Full-year weekly appearances are deduplicated.
- [x] Unresolved chart identities remain visible.
- [x] VIDEO VAULT contributes zero coverage.
- [x] Outside-managed paths contribute zero ready coverage.
- [x] Audio probing remains selective, cached, and deterministic.
- [x] Valid resolved/video-missing songs can open Phase 1.
- [x] No audio acquisition or XML/media mutation was added.
- [x] Targeted TypeScript and deterministic fixtures pass.
- [x] Live Billboard week and representative full-year validations pass.
- [x] Visual validation passes.
- [x] Report updated.
- [x] Nothing staged, committed, or pushed.
- [ ] Studio optimized production build remains blocked by heap exhaustion.

The Billboard correction is functionally complete and evidence-verified. The remaining build item is an environmental validation gap rather than an implementation gap.

## 17. Cockpit Registration

Official application identity: **RV04-04 — Media Coverage**

- Route: `/bobos/virtualdj-media-coverage`
- Registry: `packages/shared/lib/bobos/rv-registry.ts`
- Cockpit section: `RV04 · AI`, presented in the existing Catalog panel group
- Card title: `Media Coverage`
- Description: `Billboard-to-VirtualDJ audio and video coverage.`
- Status: existing `Healthy`/available status convention; no live scan or filesystem work is performed by the Cockpit card
- Icon treatment: the Cockpit has no separate icon field or icon package. The entry reuses the existing catalog panel treatment, status lamp, and RV04 category accent used by neighboring applications.

RV04-04 was confirmed unused before editing. The canonical RV04 identifiers were `RV04-01`, `RV04-03`, and `RV04-06`; the final registry uniqueness check found no duplicate identifiers.

The entry uses the existing `PanelTypeId` → `PANEL_LIBRARY` → `RV_REGISTRY` pattern. It creates no second registry, route, state store, embedded Media Coverage UI, automatic scan, XML access, or public navigation.

Browser verification:

- RV04 picker displayed `RV04-04 Media Coverage` as an available Cockpit card alongside the existing RV04 panels.
- The registered launcher target resolved to `/bobos/virtualdj-media-coverage`.
- Direct navigation rendered `VirtualDJ Media Coverage` with the Billboard controls intact.
- Browser back returned to `/bobos` and restored the BobOS Cockpit.
- Media Coverage rendered at 1,280 px with document width 1,265 px; no horizontal overflow was observed.

Validation:

- RV registry check: `RV04-04` present, `duplicates: []`.
- Full Studio type-check still reports only the pre-existing Credentials WIP errors (`credentialsLibraryPath` and `credentialsMigrationReportRoot`); no Cockpit registration error was reported.
- No Media Coverage fixtures or shared coverage behavior were modified.

Exact files changed for this integration:

```text
packages/shared/lib/bobos/rv-registry.ts
packages/shared/lib/bobos/cockpit/types.ts
packages/shared/lib/bobos/cockpit/panel-library.ts
reports/virtualdj-media-coverage-phase-2a.md
```

Isolated integration diff relative to `HEAD`: 4 files, 432 added lines, 0 deleted lines (422 report lines plus 10 tracked registry/panel lines).

The proposed staging list for this integration is exactly the four files above. The earlier 34-file list in Section 14 is the underlying Media Coverage feature scope, not an additional Cockpit change.

Nothing was staged, committed, or pushed. All unrelated working-tree changes remain excluded.

## 18. Authorization Fix

### Root cause

RV04-04 rendered its local-only page without first using the existing BobOS PIN entry flow. Its client then called `/api/ops/virtualdj-media-coverage/*`, while `apps/studio/middleware.ts` correctly requires the canonical `retroverse_ops_gate=ok` cookie for every `/api/ops/*` request. With no gate cookie, middleware returned the exact response:

```text
HTTP/1.1 401 Unauthorized
Unauthorized
```

The exact branch is the middleware condition:

```text
pathname.startsWith("/api/ops/") && !opsGateCookieValue(request)
```

which returns `new NextResponse("Unauthorized", { status: 401 })`.

The route handlers themselves already used the canonical `isOpsEnabled()`/`requireCoverageOps()` pattern. No chart, XML, matching, audio, video, persistence, or API behavior was changed.

### Fix

The Media Coverage page now checks the existing `OPS_GATE_COOKIE` with `cookies()` and redirects an unauthenticated local operator to:

`/internal/ops-pin?next=%2Fbobos%2Fvirtualdj-media-coverage`

After the normal PIN flow sets the host-local gate cookie, the page loads its APIs normally. This keeps the Ops gate intact and avoids requiring Bob to inject headers, cookies, or tokens manually.

The documented local Studio command was verified as:

`RETROVERSE_OPS=1 npm run dev`

The environment was not the root cause of the reproduced 401: with `RETROVERSE_OPS=1` active, an absent gate cookie still correctly produced 401. The environment was restored correctly for validation.

### Host and API verification

Unauthenticated protection:

- `127.0.0.1` → `/api/ops/virtualdj-media-coverage/scans` returned **401 Unauthorized** with body `Unauthorized`.

After the normal local PIN flow, both local hosts returned **200** for:

| Host | chart-options | scans list | scan load |
|---|---:|---:|---:|
| `localhost:3000` | 200 | 200 | 200 |
| `127.0.0.1:3000` | 200 | 200 | 200 |

The authenticated decisions endpoint also passed the middleware and returned its expected validation response (**400**, `Valid target, media axis, and action required`) for an intentionally empty body; it did not bypass authorization.

An authenticated normal week scan POST succeeded:

`coverage-20260730002748-beeb9cf431`

Browser acceptance passed on `localhost:3000`:

- no red Unauthorized message;
- Billboard Hot 100, year, month/week controls, and existing scans populated;
- newly-created scan appeared in the resume list;
- Full year selected successfully with month/week hidden and Scan enabled;
- page width remained 1,265 px inside a 1,280 px viewport;
- direct route remained usable after authorization.

The existing detail drawer, operator decisions, and Phase 1 Video Acquisition handoff were not changed. Earlier coverage validation already verified those workflows.

### Production protection

`shouldAllowOpsRoutes()` still blocks non-local production hosts, `isOpsEnabled()` still requires the Studio environment flag, and middleware still protects every `/api/ops/*` request with the gate cookie. No API was made public and no production authorization branch was weakened.

### Files changed

```text
apps/studio/app/bobos/virtualdj-media-coverage/page.tsx
reports/virtualdj-media-coverage-phase-2a.md
```

The isolated bug-fix diff is 2 files, 530 added lines, 0 deleted lines relative to `HEAD` (26 page lines plus the 504-line report). No unrelated files were changed, staged, committed, or pushed.
