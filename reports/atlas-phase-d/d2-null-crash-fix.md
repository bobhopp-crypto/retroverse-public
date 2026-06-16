# D2 Mission Crash — Root Cause & Fix

**Date:** 2026-06-15  
**URL:** `/ops/atlas/mission/RVTR097615`  
**Error:** `TypeError: Cannot read properties of null (reading 'toUpperCase')`

---

## Root cause

| Field | File | Line | Value |
|-------|------|------|-------|
| **`candidate.rvtr`** | `lib/atlas/load-mission.ts` | `relatedByArtist()` loop | `null` |

Rhiannon's audit row is valid (`rvtr: "RVTR097615"`). The crash happened while building **same-artist shelf**: `relatedByArtist()` iterates **all** `audit.rows` and called `candidate.rvtr.toUpperCase()` without a null check.

The audit JSON contains rows with `"rvtr": null` (e.g. Little River Band — Happy Anniversary, Eagles — Life In The Fast Lane). Any mission whose artist shelf scan reaches those rows crashed before render.

---

## Secondary risk sites (also fixed)

| Field | File | Line |
|-------|------|------|
| `row.rvtr` | `lib/atlas/load-mission.ts` | `toAtlasMission`, `findAuditMissionRow` |
| `track.track_id` | `lib/track/album-link-recovery/fetch-candidates.ts` | `fetchAlbumLinkCandidates` |
| `row.album_title` / `row.artist_name` | `fetch-candidates.ts` | `rowToCandidate` |
| `track.canonical_title` | `audit-track.ts` | audit return + rankCandidates |
| `workspace.verb` | `components/atlas/MissionCardClient.tsx` | header render |

---

## Fix

Added `lib/atlas/mission-safe.ts`:

- `normRvtrId()` — safe RVTR normalization, returns `null` when missing
- `normText()` / `normArtistKey()` — safe string defaults
- `logMissionNullFields()` — logs null enrichment fields for RVTR097615 at load time

All mission loaders now skip or default null enrichment fields instead of calling string methods on null.

---

## RVTR097615 audit row (actual values)

Rhiannon row itself has **no null fields** except expected optional linkage flags:

| Field | Value |
|-------|-------|
| rvtr | RVTR097615 |
| artist | Fleetwood Mac |
| title | Rhiannon |
| mediaId | 9282 |
| path | `/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Fleetwood Mac - Rhiannon.mp4` |
| performanceYear | 1976 |
| playCount | 37 |
| peakHot100 | 11 |
| canonicalTags | `[]` |
| classification | Cocktail |
| tvLinkage | false |
| movieLinkage | false |

Crash was **not** from Rhiannon's row — from **other rows** scanned during related-artist build.

---

## Acceptance

Page loads when album, cover, commentary, TV, movie, classification, or artist metadata on **other** audit rows are null — as long as target mission has artist + title + valid RVTR.
