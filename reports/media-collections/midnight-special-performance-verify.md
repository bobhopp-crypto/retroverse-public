# Midnight Special Performance Dashboard — Verification

**Generated:** 2026-06-09T01:15:37.100Z  
**Result:** PASS

## Before / After

| Metric | Before | After generate | After accept exact |
|--------|-------:|---------------:|-------------------:|
| Performances | 2471 | 2471 | 2471 |
| Accepted | 2037 | 2037 | 2037 |
| Review | 431 | 431 | 431 |
| Failed parses | 232 | 232 | 232 |
| Est. export GB | 35.81 | 35.81 | 35.81 |

## Generation summary

- Episodes processed: 161
- Episodes with performances: 149
- Episodes zero candidates: 12
- Failed parses: 232

## Accept exact summary

- Updated to accepted: 0
- Updated to review: 0
- Skipped locked: 2040

## Checks

| Check | Pass | Detail |
|-------|------|--------|
| generate_all_episodes | ✓ | processed 161, performances 2471 |
| performances_total_positive | ✓ | total 2471 |
| accept_exact_increases_accepted | ✓ | newly accepted 0, total accepted 2037 |
| review_queue_populated | ✓ | review queue 431 |
| idempotent_rerun | ✓ | before 2471, after 2471 |
| manual_status_preserved | ✓ | bf1mfLZhmjk bf1mfLZhmjk:ch004 → rejected |
| accepted_for_preview | ✓ | accepted 2037 |
| zero_candidate_episodes_documented | ✓ | zero candidates: 12 (expected ~12 missing chapters) |

## Storage

Manifests: `RETROVERSE_DATA/media_collections/midnight_special/performances/`
Index: `performances/index.json`
Episode manifests: `performances/episodes/{episodeId}.json`

## UI routes

- Dashboard: `/ops/media-collections/midnight-special`
- Review queue: `/ops/media-collections/midnight-special/review?mode=queue`
