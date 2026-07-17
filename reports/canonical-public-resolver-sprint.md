# Canonical Public Resolver — Local Sprint Report

Scope: local only. No deployment, canonical-data write, record repair, merge, search rebuild, UI redesign, or styling change was performed.

## Canonical Resolver

Added one shared server resolver for public identity. Its Track path is exact and one-way:

`RVTR → canonical_track_display → artists.id → primary album policy → canonical year → chart_appearances → render`

The same module also resolves exact RVAL albums, numeric canonical artist IDs, canonical years, and RVTR batches for Year, Search, Artist, Discovery, and chart-week surfaces. Single-entity loaders are request-cached. Invalid name, label, and slug inputs do not re-enter through a search or first-result fallback.

Search remains a discovery surface: labels retrieve candidates, but every navigable result must carry a canonical numeric artist ID, RVAL, RVTR, or year before it can render a public entity link.

## Primary Album Policy

Added one deterministic shared policy with this order:

1. Original studio album
2. Original release
3. Canonical album
4. Compilation
5. Greatest Hits
6. Live
7. Everything else

It returns `primaryAlbum`, `secondaryAlbums`, `reason`, and `confidence`. Candidate identity always comes from an existing album ID; titles classify linked candidates but never create identity. Unexplained cross-artist standard-album links are withheld from public primary selection. Public cover fallbacks now stop when a canonical track has no policy-selected primary cover.

## Artist Identity Policy

Public Artist routes now accept only numeric `artists.id` identity. Display names, normalized names, search labels, and legacy slugs cannot resolve an Artist page. All Artist subroutes apply the same guard. Search may match display text to show candidates, but navigation uses `/artist/{id}` and ambiguous exact display names stay on Search.

## Discovery Contract

Centralized 13 retained shelves in one contract. Every entry declares purpose, source, required data, display label, and allowed pages. Existing presentation and labels were preserved.

The Song “Related songs” shelf was removed because it used the same artist-ID source and purpose as “More by artist.” Retained Song shelves are canonical artist tracks and canonical artist albums. Album breakout songs were added to the inventory alongside similar journeys and related entities.

## Loader Consolidation

- Home no longer builds a second Sunday Nights payload after Channel Zero already selected and loaded the canonical RVTR.
- Song metadata is not invoked by the public request path; it remains an offline/ops concern.
- Song page reuses its preloaded Track result, reads media ownership from the canonical track view, loads its package once, and no longer loads a full Year destination that no retained shelf consumes.
- Artist page and coverage share one request-cached canonical artist-track set. Coverage no longer performs album resolution it does not use.
- Album metadata and page rendering share cached exact-RVAL resolution.
- Artist and Year chart history now select RVTR identity first and hydrate covers through the shared primary-album policy instead of `canonical_album_tracks.position`.
- Chart-week and Search track covers use the canonical batch resolver. When a canonical track has no primary album, they render no cover rather than falling back to an independently selected album.

## Performance Before

Warm local development server, three sequential requests per route; values are medians.

| Page | Route | Median |
|---|---|---:|
| Home | `/` | 1.160 s |
| Song | `/retroverse-2/song/RVTR044043` | 3.485 s |
| Artist | `/artist/blondie` (legacy baseline) | 1.158 s |
| Album | `/album/RVAL506727` | 1.545 s |
| Year | `/rv/1979` | 2.403 s |

## Performance After

Same local method. Artist uses its canonical route after the identity change.

| Page | Route | Median | Change |
|---|---|---:|---:|
| Home | `/` | 0.068 s | 94.2% faster |
| Song | `/retroverse-2/song/RVTR044043` | 0.214 s | 93.9% faster |
| Artist | `/artist/1332` | 1.105 s | 4.6% faster |
| Album | `/album/RVAL506727` | 1.396 s | 9.6% faster |
| Year | `/rv/1979` | 2.349 s | 2.2% faster |

## Trace Mode

Local `?trace=1` is wired to Home, Song, Artist, Album, Year, and Search. It displays RVTR, Artist ID, Album ID, Primary Album, resolver path, Discovery sources, and loader timings. Search displays its candidate-resolution path before an entity is selected.

Both the trace component and Search API refuse to emit trace data when `NODE_ENV === "production"`.

## Verification Results

| RVTR | Canonical result | Primary / cover | Year / navigation | Discovery | Result |
|---|---|---|---|---|---|
| `RVTR280043` | Reunited → artist ID 4128, “Peaches” | No canonical primary album or primary cover | 1979; numeric Artist and canonical Year links | Canonical-ID shelves render, but their source data is contaminated | **Data failure** |
| `RVTR044043` | Heart Of Glass → Blondie, ID 1332 | Parallel Lines, `RVAL506727`; correct selected cover; high confidence | 1979; canonical Artist, Album, Year, and Song links | Uses the shared contract, but one Blondie catalog item resolves to a Roy Clark album/cover | **Primary pass; Discovery data failure** |
| `RVTR708312` | Sweet Home Alabama → Lynyrd Skynyrd, ID 2426 | Second Helping, `RVAL241335`; correct cover; high confidence | 1974; canonical navigation | Canonical Lynyrd Skynyrd RVTR/RVAL shelves | **Pass** |
| `RVTR148724` | Dizzy → Tommy Roe, ID 1102 | Dizzy, `RVAL409970`; correct cover; high confidence | 1969; canonical navigation | Canonical Tommy Roe RVTR/RVAL shelves | **Pass** |
| `RVTR859552` | Crimson And Clover → Tommy James And The Shondells, ID 48 | The Essentials, `RVAL545550`; greatest-hits policy, medium confidence | Canonical year 1968; Year link corrected to a 1968 chart week | Canonical artist shelves | **Architecture pass; album-data gap** |

All five canonical Song routes returned successfully in local verification. Legacy name/label routes enter the not-found boundary; they are not re-resolved by display text.

## Remaining Data Problems

- `RVTR280043` canonically points to artist ID 4128 (“Peaches”), not Peaches & Herb, and has no canonical album relationship. Its public primary album and cover are intentionally blank.
- Artist ID 4128 discovery relationships expose `RVAL220039` / “80s Fundamentals” artwork under Various Artists.
- Blondie artist ID 1332 contains `RVAL086313` / “Yesterday When I Was Young” with Roy Clark artwork, and the linked Maria track inherits it. The resolver no longer guesses around this canonical ownership problem.
- `RVTR859552` has no linked original Crimson and Clover album. The only eligible linked candidate is the 2011 compilation The Essentials.

No data, aliases, covers, or relationships were repaired during this sprint.

## Recommendation For Next Sprint

Run a separately authorized canonical-data remediation sprint for the three documented clusters: Reunited artist/album identity, the Blondie/Roy Clark album contamination, and the missing original Crimson and Clover album relationship. After those records are corrected, refresh affected precomputed public packages/exhibits and rerun this same five-RVTR trace suite. Do not merge entities unless a dedicated identity review explicitly authorizes it.

Deployment was not started.
