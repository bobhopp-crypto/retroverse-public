# Midnight Special Review Workflow Audit

**Generated:** 2026-06-09T01:28:39.928Z

## Current queue composition (430 unresolved)

| Bucket | Count | % of queue |
|--------|------:|-----------:|
| Music | 206 | 47.9% |
| Comedy/skits | 45 | 10.5% |
| Intros/interstitials | 39 | 9.1% |
| Movie clips | 1 | 0.2% |
| Unknown | 139 | 32.3% |

### Detailed composition

| Category | Count |
|----------|------:|
| MUSIC | 206 |
| COMEDY | 45 |
| INTRO_SEGMENT | 39 |
| INTERVIEW | 0 |
| MOVIE_CLIP | 1 |
| COMMERCIAL | 0 |
| UNKNOWN | 139 |

## Collection status

| Metric | Count |
|--------|------:|
| Accepted performances | 2037 |
| Rejected segments | 4 |
| Ready to export | 2037 |
| Est. export storage | 35.81 GB |

## Workload reduction (new workflow)

| Metric | Value |
|--------|------:|
| Queue before filtering | 430 |
| Music-only default view | 206 |
| Non-music hidden by default | 224 |
| **Manual review reduction** | **~52.1%** |
| Exact music (bulk-accept eligible) | 0 |

## Problem (before)

- Single scrolling table of ~430 rows mixing music, comedy, intros, clips, and unknown segments.
- Reviewer must scroll past obvious non-music chapters to reach performances.

## Fix (after)

- Classify every queue item into buckets using chapter title + artist/song heuristics.
- Default filter: **MUSIC only** (206 items).
- Bulk reject comedy (45), movie clips (1), intros (39).
- Bulk accept exact music (0).
- Card layout with confidence badges and inline preview/accept/reject/adjust.

## Recommended next step before mass export

1. Run **Reject All Comedy**, **Reject All Movie Clips**, **Reject All Intros** (confirm each).
2. Run **Accept All Exact Music** on remaining music queue.
3. Manually review remaining **~206** non-exact music candidates.
4. Spot-check UNKNOWN bucket (139 items) for misclassified music.
5. Re-run verification; target **<50** manual music reviews before enabling export batch.

**Do not export** until music queue is near zero and export spot-check passes on 5 accepted clips.
