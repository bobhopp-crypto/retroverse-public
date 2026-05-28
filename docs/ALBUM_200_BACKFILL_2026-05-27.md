# Album 200 Recovery + Backfill Priority Pass

Date: 2026-05-27

## Authoritative source used

- `public.staging_billboard_200_weekly` (`source_name = 'billboard_200_sqlite'`)
- Provenance recorded in:
  - `RETROVERSE_DATA/logs/billboard200-import/billboard200_import_2026-05-08T20-13-25-180Z.json`
  - `RETROVERSE_DATA/logs/billboard200-import/billboard200_import_2026-05-08T20-29-16-888Z.json`

## Import method

- Added deterministic script: `tools/backfill-billboard200-missing-weeks.mjs`
- Behavior:
  - Finds week dates where Hot 100 #1 exists and Billboard 200 #1 is missing.
  - Pulls only those missing week winners from `staging_billboard_200_weekly`.
  - Inserts only if no Billboard 200 #1 row already exists for that date.
  - Ensures artist/album IDs exist (creates missing canonical rows when absent).
  - Preserves all existing Billboard 200 chronology rows (no overwrite).

## Priority order execution result

Requested order:
1. 1958-1962
2. remaining partial legacy years
3. 1967 missing weeks
4. 2019
5. 2020-2025

Observed source availability and results:
- 1958-1962: no authoritative rows in staging source -> unrepaired
- Partial legacy years (1963-2018): repaired where authoritative rows exist
- 1967: all 6 requested weeks repaired
- 2019: source remains partial (only 3 weeks available in staging)
- 2020-2025: no authoritative rows in staging source -> unrepaired

## Before/after metrics

- Before:
  - expected weeks: `3517`
  - Album 200 weeks: `2506`
  - missing weeks: `1011`
  - coverage: `71.25%`
- After:
  - expected weeks: `3517`
  - Album 200 weeks: `2925`
  - missing weeks: `592`
  - coverage: `83.17%`
- Net repaired: `419` weeks

## 1967 required verification

Repaired weeks:
- `1967-06-17`
- `1967-10-28`
- `1967-11-04`
- `1967-11-11`
- `1967-11-18`
- `1967-11-25`

Post-check:
- missing 1967 weeks: `0`
- November 1967 Billboard 200 #1 rows: `4`

## Remaining gaps after backfill

Still missing (source unavailable in staging):
- 1958: 22
- 1959: 52
- 1960: 53
- 1961: 52
- 1962: 52
- 2019: 49
- 2020: 52
- 2021: 52
- 2022: 53
- 2023: 52
- 2024: 52
- 2025: 51

Total remaining missing weeks: `592`

## Integrity checks

- Duplicate Billboard 200 #1 weeks created: `0`
- Billboard 200 rows with broken album joins: `0`

