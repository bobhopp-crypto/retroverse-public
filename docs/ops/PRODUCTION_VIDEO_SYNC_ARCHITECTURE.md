# Production Video Synchronization Architecture

Status: local-only, read-only design. The permanent production scope is `/Users/bobhopp/DJ MEDIA/VIDEO/`. Archive roots are excluded.

## Operating model

The synchronizer has two entry points: a filesystem watcher/debounced scheduled scan (Workflow A) and BobOS Operations’ **Scan Production Library** command (Workflow B). Both invoke the same idempotent scanner and produce the same immutable scan snapshot. Neither path writes VirtualDJ, `database.xml`, Retroverse catalog data, routes, ratings, comments, colors, or playlists.

```text
VIDEO root → scanner → file fingerprint → candidate matcher → confidence scorer
                                      ↓
                             scan snapshot + NEW MEDIA queue
                                      ↓
                 Integrity Dashboard / Curation Studio (read-only)
                                      ↓
                         Bob approval boundary (future write sprint)
```

## Scanner and state

Each snapshot records `lastScanTime`, `lastFileCount`, `filesAdded`, `filesRemoved`, `filesChanged`, `rvtrAssigned`, and `stillUnmatched`. File identity is `(normalized filepath, size, mtime, content hash when needed)`. A scan compares snapshots; it never infers deletion as a VirtualDJ write.

## Matching and confidence

1. Preserve an existing RVTR label as an observation.
2. Normalize filename/artist/title/year metadata.
3. Query local canonical/index artifacts for exact RVTR candidates.
4. Add chart candidates only when artist/title/year agree.
5. Score exact identity, metadata agreement, chart evidence, duration, and ambiguity.
6. Route every non-exact result to `NEW MEDIA`; do not auto-assign.

Confidence bands: `0.95–1.00 ready to review`, `0.75–0.94 strong candidate`, `0.50–0.74 weak candidate`, `<0.50 unresolved`.

## Review queue

Each item contains thumbnail path, filepath, artist, title, year, proposed RVTR, confidence, and reason. Actions are `Assign RVTR`, `Open Candidate`, `Skip`, and `Ignore`. In this sprint these are UI intents only; no action has a write handler.

## Dashboard cards

Production Videos, Last Scan, New Since Last Scan, Needs RVTR, Possible Billboard Match, Needs Review, Ready To Assign, and Ready For Public Experience. Every card is scoped to the production root and has a time-series value from immutable snapshots.

## Fingerprint framework

Fingerprint remains the canonical concept. Its versioned dimensions are metadata, chart history, play history, transition history, Spotify/audio characteristics, package completeness, public experience completeness, and future AI similarity. This sprint defines storage contracts only; no similarity model is implemented.

## Safety boundary

The scanner is read-only by construction. A future assignment sprint must require an explicit approval token, show a dry-run diff, preserve Bob’s fields, and write through a separate adapter that is disabled in this sprint.
