# Album 200 Coverage Audit — Missing Year/Week Detection

Date: 2026-05-27

## Coverage summary

- Expected chronology weeks (Hot 100 #1 week dates): **3517**
- Album 200 #1 weeks present on same dates: **2506**
- Missing Album 200 weeks: **1011**
- Coverage: **71.25%**

## Pipeline audit result

- RV chronology Album branch (`lib/artist/load-chart-history.ts`) uses:
  - `chart_name = 'Billboard 200'`
  - `chart_position = 1`
  - year filter on `ca.chart_date`
- Join path (`chart_appearances -> albums -> artists`) is not dropping available Album 200 #1 rows.
- No date normalization/timezone drift found (0 missing weeks with +/-1..3 day nearby Album rows).
- No duplicate same-date Album 200 #1 collisions found.

## Requested spot checks

- `1967-11`: missing all 4 weeks (`1967-11-04`, `1967-11-11`, `1967-11-18`, `1967-11-25`)
- `1967` full year: missing 6 weeks total (months affected: Jun, Oct, Nov)
- `1958` edge: 22/22 weeks missing (no Album 200 source rows)
- Transition/partial years:
  - `1963`: first partial Album 200 coverage (42/52 weeks present)
  - `1972`: full coverage (53/53)
  - `1978`: major partial gap (16/52)
  - `2019`: collapses to 3/52
  - `2020+`: 0 Album 200 weeks in source

## Missing week/month table

Cause:
- `SOURCE_NONE`: no Album 200 #1 source rows in year
- `SOURCE_PARTIAL`: some rows exist, but missing weeks remain

| Year | Missing Weeks | Missing Months | Cause |
|------|---------------|----------------|-------|
| 1958 | 22 | 5 months | SOURCE_NONE |
| 1959 | 52 | 12 months | SOURCE_NONE |
| 1960 | 53 | 12 months | SOURCE_NONE |
| 1961 | 52 | 12 months | SOURCE_NONE |
| 1962 | 52 | 12 months | SOURCE_NONE |
| 1963 | 10 | 3 months | SOURCE_PARTIAL |
| 1964 | 7 | 3 months | SOURCE_PARTIAL |
| 1965 | 20 | 7 months | SOURCE_PARTIAL |
| 1966 | 17 | 7 months | SOURCE_PARTIAL |
| 1967 | 6 | 3 months (Jun/Oct/Nov) | SOURCE_PARTIAL |
| 1968 | 18 | 5 months | SOURCE_PARTIAL |
| 1969 | 23 | 8 months | SOURCE_PARTIAL |
| 1970 | 17 | 5 months | SOURCE_PARTIAL |
| 1971 | 4 | 3 months | SOURCE_PARTIAL |
| 1973 | 5 | 2 months | SOURCE_PARTIAL |
| 1974 | 6 | 3 months | SOURCE_PARTIAL |
| 1975 | 3 | 1 month | SOURCE_PARTIAL |
| 1976 | 3 | 1 month | SOURCE_PARTIAL |
| 1977 | 14 | 5 months | SOURCE_PARTIAL |
| 1978 | 36 | 10 months | SOURCE_PARTIAL |
| 1980 | 1 | 1 month | SOURCE_PARTIAL |
| 1981 | 7 | 2 months | SOURCE_PARTIAL |
| 1983 | 2 | 2 months | SOURCE_PARTIAL |
| 1984 | 11 | 3 months | SOURCE_PARTIAL |
| 1985 | 10 | 3 months | SOURCE_PARTIAL |
| 1986 | 9 | 5 months | SOURCE_PARTIAL |
| 1987 | 9 | 3 months | SOURCE_PARTIAL |
| 1988 | 11 | 4 months | SOURCE_PARTIAL |
| 1991 | 2 | 2 months | SOURCE_PARTIAL |
| 1992 | 2 | 1 month | SOURCE_PARTIAL |
| 1993 | 1 | 1 month | SOURCE_PARTIAL |
| 1994 | 15 | 7 months | SOURCE_PARTIAL |
| 1995 | 16 | 6 months | SOURCE_PARTIAL |
| 1996 | 8 | 4 months | SOURCE_PARTIAL |
| 1997 | 15 | 9 months | SOURCE_PARTIAL |
| 1998 | 22 | 8 months | SOURCE_PARTIAL |
| 1999 | 1 | 1 month | SOURCE_PARTIAL |
| 2002 | 4 | 2 months | SOURCE_PARTIAL |
| 2003 | 8 | 3 months | SOURCE_PARTIAL |
| 2004 | 1 | 1 month | SOURCE_PARTIAL |
| 2006 | 5 | 4 months | SOURCE_PARTIAL |
| 2007 | 7 | 3 months | SOURCE_PARTIAL |
| 2008 | 4 | 4 months | SOURCE_PARTIAL |
| 2009 | 2 | 2 months | SOURCE_PARTIAL |
| 2010 | 5 | 3 months | SOURCE_PARTIAL |
| 2011 | 2 | 1 month | SOURCE_PARTIAL |
| 2012 | 5 | 3 months | SOURCE_PARTIAL |
| 2013 | 6 | 4 months | SOURCE_PARTIAL |
| 2014 | 18 | 9 months | SOURCE_PARTIAL |
| 2015 | 6 | 5 months | SOURCE_PARTIAL |
| 2016 | 2 | 2 months | SOURCE_PARTIAL |
| 2017 | 3 | 2 months | SOURCE_PARTIAL |
| 2018 | 10 | 6 months | SOURCE_PARTIAL |
| 2019 | 49 | 12 months | SOURCE_PARTIAL |
| 2020 | 52 | 12 months | SOURCE_NONE |
| 2021 | 52 | 12 months | SOURCE_NONE |
| 2022 | 53 | 12 months | SOURCE_NONE |
| 2023 | 52 | 12 months | SOURCE_NONE |
| 2024 | 52 | 12 months | SOURCE_NONE |
| 2025 | 51 | 12 months | SOURCE_NONE |

## Repair strategy

1. Data repair first (primary)
   - Backfill missing `Billboard 200` #1 rows in `chart_appearances` for missing week dates.
   - Prioritize complete-year outages (`2020+`, `1958-1962`) and severe partial years (`2019`, `1978`).
2. Code changes
   - No mandatory chronology-join fix identified from this audit.
   - Optional guardrail: add a CI/ops audit that compares Hot 100 week dates vs Album 200 week dates and fails on unexpected coverage drops.

## Repair type decision

- Current gaps are **data-only** (import/backfill coverage), not chronology rendering logic.

